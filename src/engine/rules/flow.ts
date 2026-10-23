import type { Ability, Effect, OnTokens, Skill } from "../../content/schema";
import {
  abilitiesOf as abilitiesOfCard,
  activeInvs,
  allMods,
  ask,
  controlled,
  card,
  cardsIn,
  def,
  emit,
  enemiesAt,
  engagedWith,
  expireMods,
  hasFlag,
  inv,
  invName,
  logStep,
  attackable,
  isMassive,
  modSum,
  push,
  spendableGroupClues,
  threatArea,
  type G,
} from "../core";
import type { ChoiceOption, InvId, Step, TurnAction } from "../types";
import { activatable, canPlay, playAbility, win } from "./cards";
import { attacksOfOpportunity } from "./enemies";
import { canMoveTo, checkEngagement } from "./investigators";
import { actClueCost } from "./scenario";
import { startTest } from "./skillTest";

type Handler<T extends Step["t"]> = (g: G, step: Extract<Step, { t: T }>) => void;

function beginPhase(g: G, phase: G["s"]["phase"]) {
  expireMods(g, "phase");
  g.s.phase = phase;
  g.s.counters.phase++;
  emit(g, "phase", `${phase[0].toUpperCase()}${phase.slice(1)} phase (round ${g.s.round})`, {
    data: { phase, round: g.s.round },
  });
}

// ---------- rounds ----------
export const startRoundHandler: Handler<"StartRound"> = (g) => {
  g.s.round++;
  g.s.counters.round++;
  for (const i of Object.values(g.s.invs)) i.actionsThisRound = [];
  for (const c of cardsIn(g, "play"))
    if (def(g, c.id).replenish === "round" && def(g, c.id).uses) c.uses = def(g, c.id).uses!.count;
  const paced = (phase: Extract<Step, { t: "PhasePause" }>["phase"], step: Step): Step[] =>
    g.s.pacePhases ? [{ t: "PhasePause", phase }, step] : [step];
  push(
    g,
    ...(g.s.round > 1 ? paced("mythos", { t: "MythosPhase" }) : []),
    ...paced("investigation", { t: "InvestigationPhase" }),
    ...paced("enemy", { t: "EnemyPhase" }),
    ...paced("upkeep", { t: "UpkeepPhase" }),
    { t: "EndRound" },
  );
};

/** a paced game waits for the lead investigator before each phase (a recorded choice, so replays stay exact) */
export const phasePauseHandler: Handler<"PhasePause"> = (g, step) => {
  if (g.s.phase === "ended" || !activeInvs(g).length) return;
  const lead = activeInvs(g).includes(g.s.lead) ? g.s.lead : activeInvs(g)[0];
  ask(
    g,
    step,
    lead,
    "phase",
    `Begin the ${step.phase} phase`,
    [{ id: "continue", label: "Continue", value: "continue" }],
    { key: "phasePause", vars: { phase: step.phase } },
  );
};

export const mythosHandler: Handler<"MythosPhase"> = (g) => {
  beginPhase(g, "mythos");
  const steps: Step[] = [win("phaseBegins", { phase: "mythos" })];
  if (g.s.agenda) {
    logStep(g, "doom");
    steps.push({ t: "PlaceDoom", card: g.s.agenda, n: 1 }, { t: "CheckDoom" });
  }
  for (const i of g.s.order) steps.push({ t: "MythosDraw", inv: i });
  steps.push(win("playerWindow", { phase: "mythos" }), win("mythosEnds", {}));
  push(g, ...steps);
};

export const mythosDrawHandler: Handler<"MythosDraw"> = (g, step) => {
  if (inv(g, step.inv).status !== "playing") return;
  logStep(g, "encounter", step.inv);
  push(g, { t: "DrawEncounter", inv: step.inv });
};

export const investigationHandler: Handler<"InvestigationPhase"> = (g) => {
  beginPhase(g, "investigation");
  for (const i of Object.values(g.s.invs)) i.turnDone = false;
  push(
    g,
    win("phaseBegins", { phase: "investigation" }),
    win("playerWindow", { phase: "investigation" }),
    { t: "NextTurn" },
  );
};

/** players choose who takes the next turn (lead decides) */
export const nextTurnHandler: Handler<"NextTurn"> = (g, step) => {
  const left = activeInvs(g).filter((i) => !inv(g, i).turnDone);
  if (left.length === 0) return;
  const who = ask<InvId>(
    g,
    step,
    g.s.lead,
    "generic",
    "Who takes the next turn?",
    left.map((i) => ({ id: i, label: invName(g, i), card: inv(g, i).cardId, value: i })),
    { auto: true, key: "nextTurn" },
  );
  if (who === undefined) return;
  const me = inv(g, who);
  g.s.active = who;
  g.s.counters.turn++;
  me.actionsTaken = 0;
  for (const x of Object.values(g.s.invs)) x.defeatedHealth = 0;
  me.actionsLeft =
    3 +
    modSum(
      g,
      who,
      "additionalActions",
      allMods(g).filter((m) => !m.mod.filter),
    );
  me.restrictedActions = allMods(g)
    .filter((m) => m.target === who && m.mod.stat === "additionalActions" && m.mod.filter?.trait)
    .map((m) => ({ trait: String(m.mod.filter!.trait), left: m.mod.value ?? 1 }));
  emit(g, "turn", `${me.name}'s turn`, { inv: who });
  push(
    g,
    win("turnBegins", { inv: who }),
    win("playerWindow", { phase: "investigation", inv: who }),
    { t: "Turn", inv: who },
    { t: "NextTurn" },
  );
};

// ---------- actions ----------
function abilityActionCost(a: Ability) {
  return a.kind === "action" ? (a.actionCost ?? 1) : 0;
}

function extraCost(g: G, i: InvId, designator: string) {
  let n = 0;
  for (const c of [...threatArea(g, i), ...cardsIn(g, "play")]) {
    const fn = g.db.scripts[c.code]?.extraActionCost;
    if (fn) n += fn(g, c.id, i, designator);
  }
  return n;
}

function designatorOf(g: G, a: TurnAction): string {
  switch (a.kind) {
    case "ability": {
      const ab = abilitiesOfCard(g, a.card)[a.index];
      return ab?.designator ?? "ability";
    }
    case "play":
      return playAbility(g, a.card)?.designator ?? "play";
    default:
      return a.kind;
  }
}

/** the ability an action uses, if it is one or plays an event (for what the ability says about itself) */
function abilityOfAction(g: G, a: TurnAction) {
  return a.kind === "ability"
    ? abilitiesOfCard(g, a.card)[a.index]
    : a.kind === "play"
      ? playAbility(g, a.card)
      : undefined;
}

/** actions available (counting restricted actions usable for this action) */
function actionsFor(g: G, i: InvId, a: TurnAction, designator: string) {
  const me = inv(g, i);
  const restricted = me.restrictedActions
    .filter((r) => restrictedFits(g, i, r, a, designator))
    .reduce((n, r) => n + r.left, 0);
  return me.actionsLeft + restricted;
}

/** an extra action restricted to [action] abilities of cards with a trait (Daisy: Tome — not playing one, and only while
 *  the granting text is still active) or to a kind of action (Galvanize: fight) */
function restrictedFits(
  g: G,
  i: InvId,
  r: { trait?: string; designator?: string; left: number },
  a: TurnAction,
  designator: string,
) {
  if (r.left <= 0) return false;
  if (r.designator) return r.designator === designator;
  return (
    !!r.trait &&
    a.kind === "ability" &&
    def(g, a.card).traits.includes(r.trait) &&
    allMods(g).some(
      (m) =>
        m.target === i && m.mod.stat === "additionalActions" && m.mod.filter?.trait === r.trait,
    )
  );
}

export function actionCost(g: G, i: InvId, a: TurnAction): number {
  switch (a.kind) {
    case "endTurn":
    case "advanceAct":
      return 0;
    case "play":
      return def(g, a.card).keywords.includes("fast") ? 0 : 1 + extraCost(g, i, "play");
    case "ability": {
      const ab = abilitiesOfCard(g, a.card)[a.index];
      const base = abilityActionCost(ab);
      return base === 0 ? 0 : base + extraCost(g, i, ab.designator ?? "ability");
    }
    default:
      return 1 + extraCost(g, i, a.kind);
  }
}

/** every legal choice for the investigator whose turn it is */
export function legalTurnActions(g: G, i: InvId): ChoiceOption[] {
  const me = inv(g, i);
  const out: ChoiceOption[] = [];
  const add = (a: TurnAction, label: string, cardId?: string) => {
    const cost = actionCost(g, i, a);
    if (cost > actionsFor(g, i, a, designatorOf(g, a))) return;
    const id = JSON.stringify(a);
    out.push({
      id,
      label: cost > 1 ? `${label} [${cost} actions]` : label,
      card: cardId,
      value: a,
    });
  };
  const loc = me.location;
  if (loc) {
    const l = card(g, loc);
    if (l.revealed && def(g, loc).shroud !== null && !hasFlag(g, loc, "cannotBeInvestigated"))
      add({ kind: "investigate" }, `Investigate ${def(g, loc).name}`, loc);
    for (const c of cardsIn(g, "location"))
      if (canMoveTo(g, i, c.id))
        add({ kind: "move", to: c.id }, `Move to ${def(g, c.id).name}`, c.id);
  }
  add({ kind: "draw" }, "Draw 1 card");
  add({ kind: "resource" }, "Gain 1 resource");
  const extra = controlled(g, i).flatMap(
    (c) => g.db.scripts[c.code]?.extraPlayable?.(g, c.id, i) ?? [],
  );
  for (const h of [...me.hand, ...extra]) {
    if (canPlay(g, i, h, false)) add({ kind: "play", card: h }, `Play ${def(g, h).name}`, h);
    else if (canPlay(g, i, h, true))
      add({ kind: "play", card: h }, `Play ${def(g, h).name} (fast)`, h);
  }
  for (const r of activatable(g, i, ["action", "fast"])) {
    add(
      { kind: "ability", card: r.card, index: r.index },
      r.ability.label ?? `${def(g, r.card).name}: ${r.ability.designator ?? "ability"}`,
      r.card,
    );
  }
  for (const e of enemiesAt(g, loc)) {
    if (attackable(g, e.id) && def(g, e.id).enemy?.fight !== null)
      add({ kind: "fight", enemy: e.id }, `Fight ${def(g, e.id).name}`, e.id);
    if (e.engagedWith !== i && !isMassive(g, e.id))
      add({ kind: "engage", enemy: e.id }, `Engage ${def(g, e.id).name}`, e.id);
  }
  for (const e of engagedWith(g, i))
    if (def(g, e.id).enemy?.evade !== null)
      add({ kind: "evade", enemy: e.id }, `Evade ${def(g, e.id).name}`, e.id);
  if (
    g.s.act &&
    (def(g, g.s.act).actAdvance ?? "turn") === "turn" &&
    spendableGroupClues(g) >= actClueCost(g)
  ) {
    add({ kind: "advanceAct" }, `Advance act (spend ${actClueCost(g)} clues as a group)`, g.s.act);
  }
  out.push({
    id: JSON.stringify({ kind: "endTurn" }),
    label: "End turn",
    value: { kind: "endTurn" },
  });
  return out;
}

export { spendableGroupClues };

export const turnHandler: Handler<"Turn"> = (g, step) => {
  const me = inv(g, step.inv);
  if (me.status !== "playing" || g.s.phase === "ended" || me.turnDone) return;
  const opts = legalTurnActions(g, step.inv);
  const a = ask<TurnAction>(
    g,
    step,
    step.inv,
    "turn",
    `${me.name}: choose an action (${me.actionsLeft} left)`,
    opts,
    { key: "turn", vars: { actions: me.actionsLeft } },
  );
  if (a === undefined) return;
  if (a.kind === "endTurn") {
    push(g, { t: "EndTurn", inv: step.inv });
    return;
  }
  push(g, { t: "PerformAction", inv: step.inv, action: a }, { t: "Turn", inv: step.inv });
};

export const endTurnHandler: Handler<"EndTurn"> = (g, step) => {
  const me = inv(g, step.inv);
  if (me.turnDone) return;
  me.turnDone = true;
  push(g, win("turnEnds", { inv: step.inv }), {
    t: "Script",
    code: "__engine",
    fn: "endTurnCleanup",
    ctx: { inv: step.inv },
  });
};

export function endTurnCleanup(g: G, i: InvId) {
  expireMods(g, "turn");
  if (g.s.active === i) g.s.active = null;
}

const NO_AOO = ["fight", "evade", "parley", "resign"];

export const performActionHandler: Handler<"PerformAction"> = (g, step) => {
  const { inv: i, action: a } = step;
  const me = inv(g, i);
  const cost = actionCost(g, i, a);
  const designator = designatorOf(g, a);
  // spend actions (restricted actions first when they apply)
  let left = cost;
  for (const r of me.restrictedActions) {
    if (left > 0 && restrictedFits(g, i, r, a, designator)) {
      const n = Math.min(left, r.left);
      r.left -= n;
      left -= n;
    }
  }
  me.actionsLeft -= left;
  if (cost > 0) {
    me.actionsThisRound.push(designator);
    me.actionsTaken++;
  }
  const steps: Step[] = [];
  if (cost > 0 && !NO_AOO.includes(designator) && abilityOfAction(g, a)?.aoo !== false)
    steps.push(...attacksOfOpportunity(g, i));
  const ctx = { you: i, inv: i };
  switch (a.kind) {
    case "investigate": {
      const loc = me.location!;
      steps.push({
        t: "Script",
        code: "__engine",
        fn: "investigate",
        ctx: { ...ctx, location: loc },
      });
      break;
    }
    case "move":
      steps.push({ t: "Move", inv: i, to: a.to });
      break;
    case "draw":
      emit(g, "action", `${me.name} takes the draw action`, { inv: i });
      // choosing the Draw action is the tap on the deck: no second wait
      steps.push({ t: "Draw", inv: i, n: 1, tapped: true });
      break;
    case "resource":
      me.resources++;
      emit(g, "resource", `${me.name} gains 1 resource`, { inv: i, data: { n: 1 } });
      break;
    case "play":
      steps.push({ t: "PlayCard", inv: i, card: a.card });
      break;
    case "ability":
      steps.push({ t: "UseAbility", inv: i, card: a.card, index: a.index });
      break;
    case "fight":
      steps.push({
        t: "Script",
        code: "__engine",
        fn: "basicFight",
        ctx: { ...ctx, enemy: a.enemy },
      });
      break;
    case "evade":
      steps.push({
        t: "Script",
        code: "__engine",
        fn: "basicEvade",
        ctx: { ...ctx, enemy: a.enemy },
      });
      break;
    case "engage":
      steps.push({ t: "EnemyEngage", enemy: a.enemy, inv: i });
      break;
    case "advanceAct":
      steps.push({ t: "AdvanceAct", spend: true });
      break;
  }
  steps.push({ t: "CheckObjectives" });
  push(g, ...steps);
};

export function basicInvestigate(
  g: G,
  i: InvId,
  loc: string,
  extra: {
    bonus?: number;
    shroud?: number;
    skill?: Skill;
    insteadOfClues?: Effect[];
    source?: string | null;
    onSuccess?: Effect[];
    onFail?: Effect[];
    onTokens?: OnTokens;
  } = {},
) {
  const skill = extra.skill ?? def(g, loc).investigateSkill ?? "intellect";
  startTest(g, {
    inv: i,
    skill,
    kind: "investigate",
    target: loc,
    source: extra.source ?? null,
    label: `Investigate ${def(g, loc).name}`,
    skillBonus: extra.bonus,
    shroudMod: extra.shroud,
    insteadOfClues: extra.insteadOfClues,
    onSuccess: extra.onSuccess,
    onFail: extra.onFail,
    onTokens: extra.onTokens,
    ctx: { you: i, location: loc, source: extra.source ?? null },
  });
}

// ---------- enemy phase ----------
export const enemyPhaseHandler: Handler<"EnemyPhase"> = (g) => {
  if (g.s.phase === "ended") return;
  beginPhase(g, "enemy");
  push(
    g,
    win("phaseBegins", { phase: "enemy" }),
    { t: "HunterMoves" },
    win("playerWindow", { phase: "enemy" }),
    { t: "EnemyAttacks" },
    win("enemyPhaseEnds", {}),
  );
};

// ---------- upkeep ----------
export function readyAll(g: G) {
  for (const c of Object.values(g.s.cards))
    if (["play", "enemy", "location", "attached", "investigator", "threat"].includes(c.zone))
      c.exhausted = false;
  emit(g, "ready", "All exhausted cards are readied");
}

export const upkeepHandler: Handler<"UpkeepPhase"> = (g) => {
  if (g.s.phase === "ended") return;
  beginPhase(g, "upkeep");
  logStep(g, "upkeep");
  // the player window comes before exhausted cards ready (Grimoire, 4.1 to 4.3)
  const steps: Step[] = [
    win("phaseBegins", { phase: "upkeep" }),
    win("playerWindow", { phase: "upkeep" }),
    { t: "Script", code: "__engine", fn: "readyAll", ctx: {} },
  ];
  // readied enemies at an investigator's location engage
  for (const i of activeInvs(g))
    steps.push({ t: "Script", code: "__engine", fn: "checkEngagement", ctx: { inv: i } });
  for (const i of g.s.order) {
    if (inv(g, i).status !== "playing") continue;
    steps.push(
      { t: "Draw", inv: i, n: 1 },
      { t: "Script", code: "__engine", fn: "gainResource", ctx: { inv: i } },
    );
  }
  for (const i of g.s.order) steps.push({ t: "HandSize", inv: i });
  push(g, ...steps);
};

export const endRoundHandler: Handler<"EndRound"> = (g) => {
  if (g.s.phase === "ended") return;
  // "until the end of the round" effects expire before "at the end of the round" abilities (Grimoire, Lasting Effects)
  push(g, { t: "Script", code: "__engine", fn: "roundCleanup", ctx: {} }, win("roundEnds", {}), {
    t: "StartRound",
  });
};

export function roundCleanup(g: G) {
  expireMods(g, "round");
}

export { checkEngagement };

export const handlers = {
  StartRound: startRoundHandler,
  PhasePause: phasePauseHandler,
  MythosPhase: mythosHandler,
  MythosDraw: mythosDrawHandler,
  InvestigationPhase: investigationHandler,
  NextTurn: nextTurnHandler,
  Turn: turnHandler,
  EndTurn: endTurnHandler,
  PerformAction: performActionHandler,
  EnemyPhase: enemyPhaseHandler,
  UpkeepPhase: upkeepHandler,
  EndRound: endRoundHandler,
};
