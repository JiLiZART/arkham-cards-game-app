/**
 * The campaign flow interpreter (ADR-0011): runs a campaign's step language over `CampaignState.flow`, a serialisable
 * cursor. `advance` answers the prompt the flow is waiting at (if there is one) and runs on until the next prompt, the
 * next scenario, or the end of the campaign. It is pure (it clones the state) and deterministic: random draws come from
 * the campaign's own generator.
 *
 * The cursor: `queue` holds the steps still to run (a step id, or a step made on the spot); `waiting` is the prompt the
 * players are looking at; `pos` is where the order of play stands; `play` is the scenario to play (or being played).
 */
import { flowOf, resolutionSteps } from "../content/flow";
import type { CampaignStep, FlowCondition, FlowEffect } from "../content/schema";
import type { CampaignState } from "./campaign";
import { addCards, crossOut, hasEntry, logCount, NOTES, record, setCount, setInvestigatorCount } from "./campaignLog";
import { randInt } from "./rng";
import type { ContentDb, InvId } from "./types";

export type QueueItem = string | CampaignStep;

/** what the players are asked: a step of the flow, or one the interpreter makes (reading on, the next scenario, who) */
export type WaitingStep =
  | Extract<CampaignStep, { kind: "chooseOne" | "counter" | "investigatorChoice" | "cardChoice" | "checklist" | "sideScenario" | "unsupported" | "upgradeDecks" }>
  | { kind: "continue" }
  | { kind: "play"; scenario: string }
  | { kind: "investigator"; effects: FlowEffect[] };

export interface Waiting {
  id: string;
  step: WaitingStep;
}

/** the facts of the scenario whose resolution is running, kept as data (the game state itself is gone by then) */
export interface ScenarioFacts {
  id: string;
  resolution: string;
  victory: number;
  victoryCodes: string[];
  cultistsVictory: string[];
  cultistsRemaining: string[];
  /** investigators who did not resign */
  notResigned: string[];
}

export type Shown = { story: string } | { recorded: { id: string; section: string } };

export interface FlowState {
  queue: QueueItem[];
  /** what has been read since the last prompt was answered: story steps, and the log entries recorded */
  shown: Shown[];
  waiting: Waiting | null;
  /** the order item last started (-1 before the first) */
  pos: number;
  /** the scenario to play now, or being played */
  play: string | null;
  /** a scenario is being played: the flow waits for its end */
  playing: boolean;
  /** the item play goes to next, set by a next or replayed scenario */
  override: string | null;
  skipped: string[];
  data: Record<string, unknown>;
  answers: { step: string; value: unknown }[];
  scenario: ScenarioFacts | null;
  /** the interlude or epilogue being read, for the heading */
  item: string | null;
}

export type FlowValue = string | number | string[] | null;

export function initFlow(db: ContentDb, campaignId: string): FlowState {
  return { queue: [...flowOf(db, campaignId).setup], shown: [], waiting: null, pos: -1, play: null, playing: false, override: null, skipped: [], data: {}, answers: [], scenario: null, item: null };
}

// ---------- who, and the investigators ----------

const active = (c: CampaignState) => c.investigators.filter((i) => i.status === "active");

/** whom an effect is for; `choice` has been turned into `input` by the time it is applied */
function targets(c: CampaignState, who: string | undefined, input: Input): InvId[] {
  const list = active(c).map((i) => i.code);
  switch (who) {
    case "lead":
      return list.includes(c.lead) ? [c.lead] : list.slice(0, 1);
    case "input":
      return input.inv ? [input.inv] : [];
    case "choice":
      return list.slice(0, 1);
    default:
      return list;
  }
}

interface Input {
  inv?: string | null;
  n?: number;
  code?: string;
}

const basicWeaknesses = (db: ContentDb, trait?: string) => Object.values(db.cards).filter((c) => c.subtype === "basicweakness" && c.type !== "investigator" && (!trait || c.traits.includes(trait)));

// ---------- conditions ----------

export function test(db: ContentDb, c: CampaignState, cond: FlowCondition, input: Input = {}): boolean {
  const inv = (who: "any" | "input" | "lead") => (who === "any" ? active(c) : active(c).filter((i) => (who === "lead" ? i.code === c.lead : i.code === input.inv)));
  const within = (n: number, min?: number, max?: number) => n >= (min ?? -Infinity) && n <= (max ?? Infinity);
  switch (cond.kind) {
    case "logHas":
      return hasEntry(c.log, cond.id, cond.section ?? NOTES);
    case "logCrossedOut":
      return hasEntry(c.log, cond.id, cond.section ?? NOTES, true);
    case "logCount":
      return within(logCount(c.log, cond.id, cond.section ?? NOTES), cond.min, cond.max);
    case "logCards": {
      const cards = c.log[cond.section ?? NOTES]?.cards[cond.id] ?? [];
      return cond.card ? cards.includes(cond.card) : cards.length > 0;
    }
    case "investigatorCount": {
      const by = c.log[cond.section ?? NOTES]?.investigators[cond.id] ?? {};
      return inv(cond.inv).some((i) => within(by[i.code] ?? 0, cond.min, cond.max));
    }
    case "scenarioCompleted":
      return c.history.some((h) => h.scenarioId === cond.scenario && (!cond.resolution || h.resolution === cond.resolution));
    case "difficulty":
      return cond.is.includes(c.difficulty);
    case "playerCount":
      return within(c.investigators.length, cond.min, cond.max);
    case "trauma":
      return inv(cond.inv).some((i) => (cond.physical === undefined || i.physicalTrauma >= cond.physical) && (cond.mental === undefined || i.mentalTrauma >= cond.mental));
    case "hasCard":
      return inv(cond.inv).some((i) => i.deck.includes(cond.card));
    case "data":
      return cond.equals !== undefined ? c.flow.data[cond.key] === cond.equals : Number(c.flow.data[cond.key] ?? 0) >= (cond.min ?? 1);
    case "not":
      return !test(db, c, cond.condition, input);
    case "all":
      return cond.conditions.every((x) => test(db, c, x, input));
    case "any":
      return cond.conditions.some((x) => test(db, c, x, input));
    case "unsupported":
      return cond.take;
  }
}

// ---------- effects ----------

/** the effect with "input" amounts and codes filled in from the answer */
function bound(e: FlowEffect, input: Input): FlowEffect {
  if ((e.do === "count" || e.do === "investigatorCount") && e.value === "input") return { ...e, value: input.n ?? 0 };
  if ((e.do === "removeCard" || e.do === "earnCard") && e.code === "$input") return { ...e, code: input.code ?? "" };
  if (e.do === "listCards" && e.codes.includes("$input")) return { ...e, codes: e.codes.map((x) => (x === "$input" ? (input.code ?? "") : x)) };
  return e;
}

function kill(c: CampaignState, inv: InvId) {
  const i = c.investigators.find((x) => x.code === inv);
  if (i && i.status === "active") i.status = "killed";
}

function apply(db: ContentDb, c: CampaignState, raw: FlowEffect, input: Input, rng: { rng: number }) {
  const e = bound(raw, input);
  const who = (w: string | undefined) => targets(c, w, input).map((code) => c.investigators.find((i) => i.code === code)!);
  const facts = c.flow.scenario;
  switch (e.do) {
    case "record": {
      const section = e.section ?? NOTES;
      c.log = record(c.log, e.key, section, e.value === true ? undefined : e.value);
      if (section !== "hidden") c.flow.shown.push({ recorded: { id: e.key, section } });
      return;
    }
    case "crossOut":
      c.log = crossOut(c.log, e.key, e.section ?? NOTES, e.erase);
      return;
    case "crossOutIfInVictory":
      if (facts?.victoryCodes.includes(e.code)) c.log = crossOut(c.log, e.key, NOTES, true);
      return;
    case "recordCards":
      c.log = addCards(c.log, e.key, e.source === "victoryUniqueCultists" ? (facts?.cultistsVictory ?? []) : (facts?.cultistsRemaining ?? []), false, NOTES);
      return;
    case "count":
      c.log = setCount(c.log, e.id, e.op, e.value === "input" ? 0 : e.value, e.section ?? NOTES);
      return;
    case "listCards":
      c.log = addCards(c.log, e.id, e.codes, e.remove, e.section ?? NOTES);
      return;
    case "investigatorCount":
      for (const i of who(e.who)) c.log = setInvestigatorCount(c.log, e.id, i.code, e.op, e.value === "input" ? 0 : e.value, e.section ?? NOTES);
      return;
    case "xp": {
      const n = e.bonus + (e.victory ? (facts?.victory ?? 0) : 0);
      for (const i of who(e.who)) i.xp += n;
      const last = c.history.at(-1);
      if (last && facts && last.scenarioId === facts.id && e.who !== "lead") last.xp += n;
      return;
    }
    case "trauma":
      for (const i of who(e.who)) {
        i.physicalTrauma += e.physical;
        i.mentalTrauma += e.mental;
      }
      return;
    case "kill":
      for (const i of active(c)) if (e.who === "each" || facts?.notResigned.includes(i.code) !== false) kill(c, i.code);
      return;
    case "earnCard":
      for (const i of who(e.who === "choice" ? "lead" : e.who)) i.deck.push(e.code);
      return;
    case "removeCard":
      for (const i of e.who ? who(e.who) : c.investigators) i.deck = i.deck.filter((x) => x !== e.code);
      return;
    case "replaceCard":
      for (const i of who(e.who)) i.deck = i.deck.map((x) => (x === e.old ? e.new : x));
      return;
    case "addWeakness": {
      const pool = basicWeaknesses(db, e.trait || undefined);
      for (const i of who(e.who)) if (pool.length) i.deck.push(pool[randInt(rng, pool.length)].code);
      return;
    }
    case "addChaosToken":
      c.chaosBag.push(e.token);
      return;
    case "removeChaosToken": {
      const at = c.chaosBag.indexOf(e.token);
      if (at >= 0) c.chaosBag.splice(at, 1);
      return;
    }
    case "end":
      c.result = e.result;
      return;
    case "nextScenario":
      c.flow.override = e.scenario;
      c.flow.skipped = c.flow.skipped.filter((x) => x !== e.scenario);
      return;
    case "replayScenario":
      c.flow.override = e.scenario;
      c.flow.skipped = c.flow.skipped.filter((x) => x !== e.scenario);
      return;
    case "skipScenario":
      if (!c.flow.skipped.includes(e.scenario)) c.flow.skipped.push(e.scenario);
      return;
    case "setData":
      c.flow.data[e.key] = e.value;
      return;
  }
}

/** killed or driven insane by the trauma so far; a lead who is out hands the lead on */
export function settle(db: ContentDb, c: CampaignState) {
  for (const i of c.investigators) {
    if (i.status !== "active") continue;
    const d = db.cards[i.code];
    if (i.physicalTrauma >= (d.health ?? Infinity)) i.status = "killed";
    else if (i.mentalTrauma >= (d.sanity ?? Infinity)) i.status = "insane";
  }
  if (!c.investigators.find((i) => i.code === c.lead && i.status === "active")) c.lead = c.investigators.find((i) => i.status === "active")?.code ?? c.lead;
}

/**
 * Apply effects in order. An effect for "one investigator the players choose" with more than one to choose from stops
 * for the answer; the effects after it wait in the queue behind it.
 */
function runEffects(db: ContentDb, c: CampaignState, effects: FlowEffect[], input: Input, rng: { rng: number }) {
  for (let k = 0; k < effects.length; k++) {
    const e = effects[k];
    if ("who" in e && e.who === "choice" && active(c).length > 1) {
      c.flow.queue.unshift(...(k + 1 < effects.length ? [{ kind: "effects" as const, effects: effects.slice(k + 1) }] : []));
      c.flow.waiting = { id: `who:${e.do}`, step: { kind: "investigator", effects: [{ ...e, who: "input" } as FlowEffect] } };
      return;
    }
    apply(db, c, e, input, rng);
  }
  settle(db, c);
}

// ---------- the order of play ----------

/** the next item of the order: a next or replayed scenario if one was named, else the next in the guide's order that isn't skipped; null at the end */
function nextItem(db: ContentDb, c: CampaignState): string | null {
  const flow = flowOf(db, c.campaignId);
  const f = c.flow;
  if (f.override) {
    const id = f.override;
    f.override = null;
    const at = flow.order.indexOf(id);
    if (at >= 0) f.pos = at;
    return id;
  }
  while (f.pos + 1 < flow.order.length) {
    const id = flow.order[++f.pos];
    if (!f.skipped.includes(id)) return id;
  }
  return null;
}

const stepOf = (db: ContentDb, c: CampaignState, id: string): CampaignStep | undefined => {
  const flow = flowOf(db, c.campaignId);
  if (flow.steps[id]) return flow.steps[id];
  const m = id.match(/^res:(.+):([^:]+)$/);
  return m ? resolutionSteps(db, c.campaignId, m[1], m[2]).steps[id] : undefined;
};

const PROMPTS = new Set(["chooseOne", "counter", "investigatorChoice", "cardChoice", "checklist", "sideScenario", "unsupported", "upgradeDecks"]);

/** run until a prompt, a scenario to play, or the campaign's end */
function run(db: ContentDb, c: CampaignState) {
  const f = c.flow;
  const flow = flowOf(db, c.campaignId);
  const rng = { rng: c.rng };
  try {
    for (let guard = 0; guard < 20000; guard++) {
      if (c.result || f.waiting || f.playing) return;
      if (!active(c).length && c.investigators.length) {
        c.result ??= "lose";
        return;
      }
      const item = f.queue.shift();
      if (item === undefined) {
        // everything here has run: the stories read wait for a "Continue", then the next item of the order
        if (f.shown.some((s) => "story" in s)) {
          f.waiting = { id: "continue", step: { kind: "continue" } };
          return;
        }
        f.scenario = null;
        const id = nextItem(db, c);
        f.item = null;
        if (id === null) {
          c.result ??= "win";
          return;
        }
        const interlude = flow.interludes[id];
        if (interlude) {
          f.item = id;
          f.queue.push(...interlude.steps);
          continue;
        }
        f.play = id;
        f.waiting = { id: "play", step: { kind: "play", scenario: id } };
        return;
      }
      const id = typeof item === "string" ? item : "inline";
      const st = typeof item === "string" ? stepOf(db, c, item) : item;
      if (!st) continue;
      switch (st.kind) {
        case "story":
          f.shown.push({ story: id });
          break;
        case "effects":
          runEffects(db, c, st.effects, {}, rng);
          break;
        case "branch":
          f.queue.unshift(...(test(db, c, st.condition) ? st.then : st.else));
          break;
        case "end":
          if (st.result) c.result = st.result;
          else c.result ??= "win";
          break;
        default:
          if (PROMPTS.has(st.kind)) f.waiting = { id, step: st as WaitingStep };
      }
    }
    throw new Error("the campaign flow does not end");
  } finally {
    c.rng = rng.rng;
  }
}

// ---------- answers ----------

const need = (ok: boolean, message: string) => {
  if (!ok) throw new Error(message);
};

function answer(db: ContentDb, c: CampaignState, value: FlowValue) {
  const f = c.flow;
  const w = f.waiting!;
  const st = w.step;
  const rng = { rng: c.rng };
  f.waiting = null;
  f.shown = [];
  f.answers.push({ step: w.id, value });
  const after = (steps: string[]) => f.queue.unshift(...steps);
  const text = (v: FlowValue) => String(v);
  try {
    switch (st.kind) {
      case "continue":
        return;
      case "play":
        f.playing = true;
        return;
      case "upgradeDecks":
        return;
      case "chooseOne": {
        // a single choice is a "do this, if it applies": it can be declined
        if (value === null && st.choices.length === 1) return;
        const ch = st.choices.find((x) => x.id === text(value) && (!x.when || test(db, c, x.when)));
        need(!!ch, `${text(value)} is not a choice here`);
        after(ch!.steps);
        runEffects(db, c, ch!.effects, {}, rng);
        return;
      }
      case "counter": {
        need(typeof value === "number" && value >= st.min && (st.max === undefined || value <= st.max), "that number is out of range");
        after(st.steps);
        runEffects(db, c, st.effects, { n: value as number }, rng);
        return;
      }
      case "investigatorChoice": {
        need((value === null && st.optional) || active(c).some((i) => i.code === value), "that investigator can't be chosen");
        after(st.steps);
        runEffects(db, c, st.effects, { inv: value as string | null }, rng);
        return;
      }
      case "investigator": {
        need(active(c).some((i) => i.code === value), "that investigator can't be chosen");
        runEffects(db, c, st.effects, { inv: text(value) }, rng);
        return;
      }
      case "cardChoice": {
        const codes = Array.isArray(value) ? value : [];
        need(codes.length >= st.min && codes.length <= st.max, `choose from ${st.min} to ${st.max} cards`);
        need(!st.codes.length || codes.every((x) => st.codes.includes(x)), "that card is not on offer");
        after(st.steps);
        for (const code of codes) runEffects(db, c, st.effects, { code }, rng);
        return;
      }
      case "checklist": {
        const ids = Array.isArray(value) ? value : [];
        need(ids.length >= st.min && (st.max === undefined || ids.length <= st.max), "that many can't be ticked");
        const chosen = ids.map((id) => st.choices.find((x) => x.id === id));
        need(chosen.every((x) => !!x && (!x.when || test(db, c, x.when))), "that is not on the list");
        after(chosen.flatMap((x) => x!.steps));
        for (const ch of chosen) runEffects(db, c, ch!.effects, {}, rng);
        return;
      }
      case "sideScenario": {
        if (value === null) return;
        const offer = st.scenarios.find((x) => x.scenario === value);
        need(!!offer, "that scenario is not on offer");
        need(active(c).every((i) => i.xp >= offer!.cost), `each investigator needs ${offer!.cost} experience`);
        for (const i of active(c)) i.xp -= offer!.cost;
        f.override = offer!.scenario;
        return;
      }
      case "unsupported":
        after(st.steps);
        runEffects(db, c, st.effects, {}, rng);
        return;
    }
  } finally {
    c.rng = rng.rng;
  }
}

/**
 * Move the flow on: with an answer to the prompt it waits at (a choice id, a number, an investigator, card codes, a
 * list of ids, a scenario or null; "continue" for reading on), then run to the next prompt. Without one it just runs,
 * which is how a campaign starts. The state given is not changed.
 */
export function advance(db: ContentDb, c0: CampaignState, value?: FlowValue): CampaignState {
  const c = structuredClone(c0);
  if (c.flow.waiting) {
    need(value !== undefined, "the flow is waiting for an answer");
    answer(db, c, value as FlowValue);
  } else need(value === undefined, "the flow is not waiting for an answer");
  run(db, c);
  return c;
}

/** the resolution of a scenario just ended: its steps run, then the flow goes on (the engine's own part of the end is done) */
export function startResolution(db: ContentDb, c0: CampaignState, facts: ScenarioFacts): CampaignState {
  const c = structuredClone(c0);
  // a scenario that has ended: the "begin" prompt that started it (if the caller never answered it) is moot
  c.flow.waiting = null;
  c.flow.playing = false;
  c.flow.play = null;
  c.flow.scenario = facts;
  c.flow.queue.unshift(...resolutionSteps(db, c.campaignId, facts.id, facts.resolution).ids);
  run(db, c);
  return c;
}
