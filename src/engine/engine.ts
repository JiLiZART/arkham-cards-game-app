import type { LogCondition, SetupStep } from "../content/schema";
import {
  card, createCard, def, emit, findByCode, inv, locationByName, moveCard, push, type G,
} from "./core";
import { handlers as effectHandlers } from "./effects";
import { randInt, shuffle } from "./rng";
import { finishEvent, handlers as cardHandlers } from "./rules/cards";
import { handlers as enemyHandlers } from "./rules/enemies";
import { basicInvestigate, endTurnCleanup, handlers as flowHandlers, legalTurnActions, roundCleanup } from "./rules/flow";
import {
  assetDefeatCheck, checkEngagement, drawOpeningCards, handlers as invHandlers, revealLocation,
} from "./rules/investigators";
import { allEliminated, finishRevelation, handlers as scenarioHandlers, nextAct, nextAgenda } from "./rules/scenario";
import { handlers as testHandlers, startTest } from "./rules/skillTest";
import type { Action, ChoiceOption, ContentDb, EffCtx, GameEvent, GameSetup, GameState, InstId, Step } from "./types";

export const ENGINE_VERSION = 2;

// ---------- internal script functions (code "__engine") ----------
const ENGINE_FNS: Record<string, (g: G, ctx: EffCtx, step: Step) => void> = {
  finishEvent: (g, ctx) => finishEvent(g, ctx),
  finishRevelation: (g, ctx) => finishRevelation(g, ctx.source!, ctx.you!),
  assetDefeatCheck: (g, ctx) => assetDefeatCheck(g, ctx.you!),
  allEliminated: (g) => allEliminated(g),
  revealLocation: (g, ctx) => revealLocation(g, ctx.location!),
  checkEngagement: (g, ctx) => checkEngagement(g, ctx.inv!),
  investigate: (g, ctx) => basicInvestigate(g, ctx.you!, ctx.location!),
  basicFight: (g, ctx) => startTest(g, { inv: ctx.you!, skill: "combat", kind: "fight", target: ctx.enemy!, label: `Fight ${def(g, ctx.enemy!).name}`, ctx }),
  basicEvade: (g, ctx) => startTest(g, { inv: ctx.you!, skill: "agility", kind: "evade", target: ctx.enemy!, label: `Evade ${def(g, ctx.enemy!).name}`, ctx }),
  endTurnCleanup: (g, ctx) => endTurnCleanup(g, ctx.inv!),
  gainResource: (g, ctx) => {
    inv(g, ctx.inv!).resources++;
  },
  roundCleanup: (g) => roundCleanup(g),
  nextAgenda: (g, ctx) => nextAgenda(g, ctx.source!),
  nextAct: (g, ctx) => nextAct(g, ctx.source!),
};

const scriptHandler = (g: G, step: Extract<Step, { t: "Script" }>) => {
  if (step.code === "__engine") {
    ENGINE_FNS[step.fn](g, step.ctx, step);
    return;
  }
  const fn = g.db.scripts[step.code]?.fns?.[step.fn] ?? g.db.scripts[g.s.scenarioId]?.fns?.[step.fn];
  if (!fn) throw new Error(`missing script function ${step.code}.${step.fn}`);
  fn(g, step.ctx, step.args, step);
};

const forEachInvHandler = (g: G, step: Extract<Step, { t: "ForEachInv" }>) => {
  push(g, ...step.invs.map((i) => ({ ...step.step, inv: i }) as Step));
};

const HANDLERS: Record<string, (g: G, step: any) => void> = {
  ...flowHandlers, ...cardHandlers, ...invHandlers, ...enemyHandlers, ...testHandlers, ...scenarioHandlers, ...effectHandlers,
  Script: scriptHandler,
  ForEachInv: forEachInvHandler,
  Setup: () => {},
  ChooseTurnOrder: () => {},
};

const MAX_STEPS = 20000;

/** resolve queued steps until a choice is needed or the queue is empty */
export function run(g: G) {
  let n = 0;
  const recent: string[] = [];
  while (!g.s.pending && g.s.queue.length && g.s.phase !== "ended") {
    if (++n > MAX_STEPS) throw new Error(`engine loop limit exceeded; recent steps: ${recent.join(" ")}`);
    const step = g.s.queue.pop()!;
    if (n > MAX_STEPS - 30) recent.push(step.t + ("trigger" in step ? `:${step.trigger}` : "") + ("fn" in step ? `:${step.fn}` : ""));
    const h = HANDLERS[step.t];
    if (!h) throw new Error(`no handler for step ${step.t}`);
    h(g, step);
  }
}

// ---------- setup ----------
export function checkLog(log: Record<string, unknown>, c: LogCondition | undefined, players: number): boolean {
  if (!c) return true;
  if ("logHas" in c) return !!log[c.logHas];
  if ("not" in c) return !checkLog(log, c.not, players);
  if ("playerCount" in c) return players === c.playerCount;
  if ("playersAtLeast" in c) return players >= c.playersAtLeast;
  if ("logCount" in c) {
    const v = log[c.logCount.key];
    const n = Array.isArray(v) ? v.length : 0;
    return n >= (c.logCount.min ?? 0) && n <= (c.logCount.max ?? Infinity);
  }
  return false;
}

function emptyState(setup: GameSetup): GameState {
  return {
    version: ENGINE_VERSION, seed: setup.seed, rng: setup.seed >>> 0, seq: 0,
    scenarioId: setup.scenarioId, campaignId: setup.campaignId, difficulty: setup.difficulty,
    round: 0, phase: "setup", counters: { turn: 0, phase: 0, round: 0, test: 0, reveal: 0 },
    cards: {}, invs: {}, order: [], lead: setup.investigators[0].code, active: null,
    encounterDeck: [], encounterDiscard: [], sideDecks: {}, act: null, agenda: null, actDeck: [], agendaDeck: [],
    chaosBag: [], skillTest: null, testStack: [], tempMods: [], usage: {}, queue: [], pending: null, cancelled: [],
    log: [], flags: {}, campaignLog: setup.campaignLog ?? {}, resolution: null, nextId: 1,
    ...(setup.pacePhases ? { pacePhases: true } : {}),
  };
}

function locByRef(g: G, ref: string) {
  return findByCode(g, ref, ["location"]) ?? locationByName(g, ref);
}

function applySetupStep(g: G, st: SetupStep) {
  const s = g.s;
  if (!checkLog(s.campaignLog, st.when, s.order.length)) return;
  const take = (code: string) => Object.values(s.cards).find((c) => c.code === code && ["setAside", "encounterDeck", "sideDeck", "limbo"].includes(c.zone));
  switch (st.do) {
    case "putIntoPlay":
      for (const code of st.codes) {
        const c = take(code);
        if (c) moveCard(g, c.id, "location");
      }
      return;
    case "putRandomIntoPlay": {
      const pool = st.from.map(take).filter(Boolean).map((c) => c!.id);
      shuffle(s, pool);
      pool.forEach((id, k) => moveCard(g, id, k < st.count ? "location" : st.removeRest ? "removed" : "setAside"));
      return;
    }
    case "setAside":
      for (const code of st.codes) {
        const c = take(code);
        if (c) moveCard(g, c.id, "setAside");
      }
      return;
    case "remove":
      for (const code of st.codes) {
        const c = Object.values(s.cards).find((x) => x.code === code && x.zone !== "removed");
        if (c) moveCard(g, c.id, "removed");
      }
      return;
    case "startAt": {
      const loc = locByRef(g, st.code);
      if (!loc) throw new Error(`startAt: ${st.code} not in play`);
      for (const i of s.order) inv(g, i).location = loc.id;
      return;
    }
    case "spawn": {
      const c = take(st.code);
      const loc = locByRef(g, st.at);
      if (c && loc) {
        moveCard(g, c.id, "limbo");
        push(g, { t: "Spawn", enemy: c.id, inv: null, at: loc.id });
      }
      return;
    }
    case "shuffleIntoEncounter":
      for (const code of st.codes) {
        const c = take(code);
        if (c) moveCard(g, c.id, "encounterDeck");
        else if (st.create) createCard(g, code, "encounterDeck");
      }
      return;
    case "placeDoomOnAgenda":
      if (s.agenda) card(g, s.agenda).doom += st.amount;
      return;
    case "addChaosToken":
      s.chaosBag.push(st.token);
      return;
    case "discardRandomFromHands":
      // applied after opening hands are drawn
      s.flags.discardFromOpeningHands = st.amount;
      return;
    case "script":
      g.db.scripts[s.scenarioId]?.fns?.[st.fn]?.(g, {}, undefined);
      return;
  }
}

export interface Result {
  state: GameState;
  events: GameEvent[];
  error?: string;
}

export function createGame(db: ContentDb, setup: GameSetup): Result {
  const scen = db.scenarios[setup.scenarioId];
  if (!scen) throw new Error(`unknown scenario ${setup.scenarioId}`);
  const campaign = db.campaigns[setup.campaignId];
  const g: G = { s: emptyState(setup), db, events: [] };
  const s = g.s;
  // investigators & decks
  setup.investigators.forEach((x, player) => {
    const cardId = createCard(g, x.code, "investigator", x.code);
    s.order.push(x.code);
    s.invs[x.code] = {
      id: x.code, cardId, name: db.cards[x.code].name, deck: [], hand: [], discard: [], location: null,
      damage: x.physicalTrauma ?? 0, horror: x.mentalTrauma ?? 0, clues: 0, resources: 5, actionsLeft: 0,
      restrictedActions: [], actionsThisRound: [], status: "playing", turnDone: false, physicalTrauma: 0, mentalTrauma: 0, player,
    };
    for (const code of x.deck) createCard(g, code, "deck", x.code);
  });
  // encounter cards
  const sets = [...scen.encounterSets];
  if (scen.randomEncounterSet?.length) sets.push(scen.randomEncounterSet[randInt(s, scen.randomEncounterSet.length)]);
  for (const set of sets) {
    for (const code of db.encounterSets[set] ?? []) {
      const d = db.cards[code];
      if (d.type === "act" || d.type === "agenda" || d.type === "scenario") continue;
      for (let k = 0; k < d.quantity; k++) createCard(g, code, d.type === "location" ? "setAside" : "encounterDeck");
    }
  }
  for (const [deck, deckSets] of Object.entries(scen.sideDecks)) {
    s.sideDecks[deck] = [];
    for (const set of deckSets) for (const code of db.encounterSets[set] ?? []) {
      for (let k = 0; k < db.cards[code].quantity; k++) s.sideDecks[deck].push(createCard(g, code, "sideDeck"));
    }
    shuffle(s, s.sideDecks[deck]);
  }
  for (const code of scen.acts) s.actDeck.push(createCard(g, code, "actDeck"));
  for (const code of scen.agendas) s.agendaDeck.push(createCard(g, code, "agendaDeck"));
  moveCard(g, s.actDeck[0], "act");
  moveCard(g, s.agendaDeck[0], "agenda");
  s.chaosBag = [...(setup.chaosBag ?? campaign?.chaosBags[setup.difficulty] ?? [])];
  for (const st of scen.setup) applySetupStep(g, st);
  shuffle(s, s.encounterDeck);
  // reveal starting locations where investigators are
  for (const i of s.order) if (s.invs[i].location) revealLocation(g, s.invs[i].location!);
  // decks & opening hands
  for (const i of s.order) {
    shuffle(s, s.invs[i].deck);
    drawOpeningCards(g, i, 5);
  }
  const discardN = (s.flags.discardFromOpeningHands as number | undefined) ?? 0;
  for (const i of s.order) {
    const me = inv(g, i);
    for (let k = 0; k < discardN && me.hand.length; k++) moveCard(g, me.hand[randInt(s, me.hand.length)], "discard");
  }
  emit(g, "setup", `${scen.name} begins`, { data: { scenario: scen.id } });
  push(g, ...s.order.map((i): Step => ({ t: "Mulligan", inv: i })), { t: "Script", code: "__engine", fn: "roundCleanup", ctx: {} }, { t: "StartRound" });
  // setup spawns pushed earlier resolve first
  s.queue = [...s.queue.filter((x) => x.t !== "Spawn"), ...s.queue.filter((x) => x.t === "Spawn")];
  run(g);
  return { state: s, events: g.events };
}

// ---------- dispatch ----------
export function dispatch(db: ContentDb, state: GameState, action: Action): Result {
  const p = state.pending;
  if (!p) return { state, events: [], error: "no pending choice" };
  if (p.inv !== action.inv) return { state, events: [], error: `waiting for ${p.inv}, not ${action.inv}` };
  const opt = p.options.find((o) => o.id === action.option);
  if (!opt) return { state, events: [], error: `illegal option ${action.option}` };
  const events: GameEvent[] = [];
  // the state is small (a few hundred cards): a plain deep copy is cheaper than proxy-based drafts
  const g: G = { s: structuredClone(state), db, events };
  g.s.pending = null;
  g.s.queue.push({ ...p.step, choice: opt.value } as Step);
  run(g);
  if (revealed(state, g.s, events)) g.s.counters.reveal = (state.counters.reveal ?? 0) + 1;
  return { state: g.s, events };
}

/** did this choice bring hidden information into play: the RNG used, a card left a deck, or deck cards were shown? */
export function revealed(prev: GameState, next: GameState, events: GameEvent[]): boolean {
  if (next.rng !== prev.rng) return true;
  const left = (a: InstId[], b: InstId[]) => a.some((id) => !b.includes(id));
  if (left(prev.encounterDeck, next.encounterDeck)) return true;
  for (const [i, me] of Object.entries(prev.invs)) if (left(me.deck, next.invs[i].deck)) return true;
  if (events.some((e) => e.type === "look")) return true;
  const shown = (s: GameState) => (s.pending?.options ?? []).some((o) => o.card && ["deck", "encounterDeck"].includes(s.cards[o.card]?.zone));
  return shown(next) && !shown(prev);
}

export const getPending = (s: GameState) => s.pending;

/** options of the active turn choice (empty when another kind of choice is pending) */
export function getLegalActions(db: ContentDb, s: GameState): ChoiceOption[] {
  if (s.pending?.kind === "turn") return s.pending.options;
  if (!s.active) return [];
  return legalTurnActions({ s, db, events: [] }, s.active);
}

export function replay(db: ContentDb, setup: GameSetup, actions: Action[]): Result {
  let r = createGame(db, setup);
  const events = [...r.events];
  for (const a of actions) {
    r = dispatch(db, r.state, a);
    if (r.error) throw new Error(`replay failed at ${JSON.stringify(a)}: ${r.error}`);
    events.push(...r.events);
  }
  return { state: r.state, events };
}

export const serialize = (s: GameState) => JSON.stringify(s);
export const deserialize = (json: string): GameState => JSON.parse(json);

export type { Action, ContentDb, GameSetup, GameState };
