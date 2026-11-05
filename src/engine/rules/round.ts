import {
  actionsOwed,
  atTurnEnd,
  discardAtRoundEnd,
  noReady,
  noVehicles,
  vehicleUsed,
} from "../world/flags";
import type { Ability, Boost, Effect, ModFlag, OnTokens, Skill } from "../../content/schema";
import {
  abilitiesOf as abilitiesOfCard,
  allMods,
  cannotGainResources,
  canReady,
  enemies,
  attackable,
  cardsIn,
  enemiesAt,
  engagedWith,
  expireMods,
  hasFlag,
  isMassive,
  modSum,
  advanceableActs,
  spendableGroupClues,
  threatArea,
  hasKeyword,
} from "../queries";
import {
  activeInvestigator,
  activeInvs,
  addCounter,
  allCards,
  ask,
  beginActions,
  bumpCounter,
  card,
  cardIf,
  clearDefeatedHealth,
  clearRoundActions,
  clearTurnDone,
  currentAct,
  currentAgendas,
  currentPhase,
  currentRound,
  def,
  dropQueuedUntil,
  emit,
  type GameContext,
  inv,
  invName,
  leadInvestigator,
  logStep,
  noteAction,
  pacesPhases,
  push,
  ready,
  setActive,
  setCounter,
  setPhase,
  setTurnDone,
  spendRestricted,
  startRound,
  turnOrder,
} from "../context";
import type { ChoiceOption, InvId, Step, TurnAction, StepOf, EffCtx } from "../world/types";
import { activatable, canPlay, playAbility, playable, spendGroupClues, win } from "./cards";
import { attacksOfOpportunity } from "./enemies";
import { canMoveTo, checkEngagement, enterCost } from "./investigators";
import { actClueCost } from "./scenario";
import { startTest } from "./skillTest";
import { EVENT } from "../events/event";
import { ZONE, PHASE, CHOICE, isOneOf } from "../world/constants";
import { STEP } from "../steps/step";
import { scriptOf } from "../world/scripts";
import { discard } from "../movement";

type Handler<T extends Step["t"]> = (game: GameContext, step: Extract<Step, { t: T }>) => void;

function beginPhase(game: GameContext, phase: GameContext["s"]["phase"]) {
  expireMods(game, "phase");
  setPhase(game, phase);
  emit(
    game,
    EVENT.Phase,
    `${phase[0].toUpperCase()}${phase.slice(1)} phase (round ${currentRound(game)})`,
    {
      data: { phase, round: currentRound(game) },
    },
  );
}

// ---------- rounds ----------
export const startRoundHandler: Handler<"StartRound"> = (game) => {
  startRound(game);
  clearRoundActions(game);
  for (const c of cardsIn(game, ZONE.Play))
    if (def(game, c.id).replenish === "round" && def(game, c.id).uses)
      setCounter(game, c.id, "uses", def(game, c.id).uses!.count);
  const paced = (phase: Extract<Step, { t: "PhasePause" }>["phase"], step: Step): Step[] =>
    pacesPhases(game) ? [{ t: STEP.PhasePause, phase }, step] : [step];
  push(
    game,
    ...(currentRound(game) > 1 ? paced(PHASE.Mythos, { t: STEP.MythosPhase }) : []),
    ...paced(PHASE.Investigation, { t: STEP.InvestigationPhase }),
    ...paced(PHASE.Enemy, { t: STEP.EnemyPhase }),
    ...paced(PHASE.Upkeep, { t: STEP.UpkeepPhase }),
    { t: STEP.EndRound },
  );
};

/** a paced game waits for the lead investigator before each phase (a recorded choice, so replays stay exact) */
export const phasePauseHandler: Handler<"PhasePause"> = (game, step) => {
  if (currentPhase(game) === "ended" || !activeInvs(game).length) return;
  const lead = activeInvs(game).includes(leadInvestigator(game))
    ? leadInvestigator(game)
    : activeInvs(game)[0];
  ask(
    game,
    step,
    lead,
    CHOICE.Phase,
    `Begin the ${step.phase} phase`,
    [{ id: "continue", label: "Continue", value: "continue" }],
    { key: "phasePause", vars: { phase: step.phase } },
  );
};

export const mythosHandler: Handler<"MythosPhase"> = (game) => {
  beginPhase(game, PHASE.Mythos);
  const steps: Step[] = [win("phaseBegins", { phase: "mythos" })];
  if (Object.values(currentAgendas(game)).some(Boolean)) {
    logStep(game, "doom");
    steps.push({ t: STEP.PlaceDoom, card: "agenda", n: 1 }, { t: STEP.CheckDoom });
  }
  for (const i of turnOrder(game)) steps.push({ t: STEP.MythosDraw, inv: i });
  steps.push(win("playerWindow", { phase: "mythos" }), win("mythosEnds", {}));
  push(game, ...steps);
};

export const mythosDrawHandler: Handler<"MythosDraw"> = (game, step) => {
  if (inv(game, step.inv).status !== "playing") return;
  logStep(game, "encounter", step.inv);
  push(game, { t: STEP.DrawEncounter, inv: step.inv });
};

export const investigationHandler: Handler<"InvestigationPhase"> = (game) => {
  beginPhase(game, PHASE.Investigation);
  clearTurnDone(game);
  push(
    game,
    win("phaseBegins", { phase: "investigation" }),
    win("playerWindow", { phase: "investigation" }),
    { t: STEP.NextTurn },
    win("phaseEnds", { phase: "investigation" }),
  );
};

/** players choose who takes the next turn (lead decides) */
export const nextTurnHandler: Handler<"NextTurn"> = (game, step) => {
  const left = activeInvs(game).filter((i) => !inv(game, i).turnDone);
  if (left.length === 0) return;
  const who = ask<InvId>(
    game,
    step,
    leadInvestigator(game),
    CHOICE.Generic,
    "Who takes the next turn?",
    left.map((i) => ({ id: i, label: invName(game, i), card: inv(game, i).cardId, value: i })),
    { auto: true, key: "nextTurn" },
  );
  if (who === undefined) return;
  const me = inv(game, who);
  setActive(game, who);
  bumpCounter(game, "turn");
  clearDefeatedHealth(game);
  beginActions(
    game,
    who,
    3 +
      modSum(
        game,
        who,
        "additionalActions",
        allMods(game).filter((m) => !m.mod.filter),
      ),
    allMods(game)
      .filter((m) => m.target === who && m.mod.stat === "additionalActions" && m.mod.filter?.trait)
      .map((m) => ({ trait: String(m.mod.filter!.trait), left: m.mod.value ?? 1 })),
  );
  // actions lost before the turn (Something in the Drinks in the mythos phase)
  const owed = actionsOwed.take(game, who) ?? 0;
  if (owed) addCounter(game, who, "actionsLeft", -Math.min(owed, inv(game, who).actionsLeft));
  emit(game, EVENT.Turn, `${me.name}'s turn`, { inv: who });
  push(
    game,
    win("turnBegins", { inv: who }),
    win("playerWindow", { phase: "investigation", inv: who }),
    { t: STEP.Turn, inv: who },
    { t: STEP.NextTurn },
  );
};

// ---------- actions ----------
function abilityActionCost(a: Ability) {
  return a.kind === "action" ? (a.actionCost ?? 1) : 0;
}

function extraCost(game: GameContext, i: InvId, designator: string, action?: TurnAction) {
  let n = 0;
  for (const c of [
    ...threatArea(game, i),
    ...cardsIn(game, ZONE.Play),
    ...cardsIn(game, ZONE.Location),
    ...cardsIn(game, ZONE.Attached),
  ]) {
    const fn = scriptOf(game.db, c.code)?.extraActionCost;
    if (fn) n += fn(game, c.id, i, designator, action);
  }
  return n;
}

function designatorOf(game: GameContext, a: TurnAction): string {
  switch (a.kind) {
    case "ability": {
      const ab = abilitiesOfCard(game, a.card)[a.index];
      return ab?.designator ?? "ability";
    }
    case "play":
      return playAbility(game, a.card)?.designator ?? "play";
    default:
      return a.kind;
  }
}

/** the ability an action uses, if it is one or plays an event (for what the ability says about itself) */
function abilityOfAction(game: GameContext, a: TurnAction) {
  return a.kind === "ability"
    ? abilitiesOfCard(game, a.card)[a.index]
    : a.kind === "play"
      ? playAbility(game, a.card)
      : undefined;
}

/** actions available (counting restricted actions usable for this action) */
function actionsFor(game: GameContext, i: InvId, a: TurnAction, designator: string) {
  const me = inv(game, i);
  const restricted = me.restrictedActions
    .filter((r) => restrictedFits(game, i, r, a, designator))
    .reduce((n, r) => n + r.left, 0);
  return me.actionsLeft + restricted;
}

/** an extra action restricted to [action] abilities of cards with a trait (Daisy: Tome — not playing one, and only while
 *  the granting text is still active) or to a kind of action (Galvanize: fight) */
function restrictedFits(
  game: GameContext,
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
    def(game, a.card).traits.includes(r.trait) &&
    allMods(game).some(
      (m) =>
        m.target === i && m.mod.stat === "additionalActions" && m.mod.filter?.trait === r.trait,
    )
  );
}

export function actionCost(game: GameContext, i: InvId, a: TurnAction): number {
  switch (a.kind) {
    case "endTurn":
    case "advanceAct":
    case "enterVehicle":
    case "leaveVehicle":
      return 0;
    case "flipVeiled":
      return 1;
    case "play":
      return def(game, a.card).keywords.includes("fast") ? 0 : 1 + extraCost(game, i, "play");
    case "ability": {
      const ab = abilitiesOfCard(game, a.card)[a.index];
      const base = abilityActionCost(ab);
      return base === 0 ? 0 : base + extraCost(game, i, ab.designator ?? "ability", a);
    }
    default:
      return 1 + extraCost(game, i, a.kind, a);
  }
}

/** the kinds of action an effect can forbid (A Baleful Welcome) */
const FORBIDDEN_BY: Partial<Record<string, ModFlag>> = {
  investigate: "cannotInvestigate",
  fight: "cannotFight",
  evade: "cannotEvade",
  move: "cannotMoveAction",
  play: "cannotPlayAction",
  [EVENT.Draw]: "cannotDrawAction",
  [EVENT.Resource]: "cannotResourceAction",
};
/** an action of a forbidden kind: a play action with a designator is of both kinds (Grimoire, Play Action) */
function forbiddenAction(game: GameContext, i: InvId, a: TurnAction, designator: string) {
  return (a.kind === EVENT.Play ? [EVENT.Play, designator] : [designator]).some((k) => {
    const flag = FORBIDDEN_BY[k];
    return !!flag && hasFlag(game, i, flag);
  });
}

/** every legal choice for the investigator whose turn it is */
export function legalTurnActions(game: GameContext, i: InvId): ChoiceOption[] {
  const me = inv(game, i);
  const out: ChoiceOption[] = [];
  const add = (a: TurnAction, label: string, cardId?: string, key?: string) => {
    const cost = actionCost(game, i, a);
    const designator = designatorOf(game, a);
    if (cost > actionsFor(game, i, a, designator)) return;
    if (cost > 0 && forbiddenAction(game, i, a, designator)) return;
    const id = JSON.stringify(a);
    out.push({
      id,
      label: cost > 1 ? `${label} [${cost} actions]` : label,
      card: cardId,
      value: a,
      ...(key && cardId ? { key, vars: { code: card(game, cardId).code } } : {}),
    });
  };
  const loc = me.location;
  if (loc) {
    const l = card(game, loc);
    if (
      l.revealed &&
      def(game, loc).shroud !== null &&
      !hasFlag(game, loc, "cannotBeInvestigated") &&
      !hasFlag(game, i, "cannotInvestigate")
    )
      add({ kind: "investigate" }, `Investigate ${def(game, loc).name}`, loc);
    for (const c of cardsIn(game, ZONE.Location))
      if (canMoveTo(game, i, c.id))
        add({ kind: EVENT.Move, to: c.id }, `Move to ${def(game, c.id).name}`, c.id);
  }
  add({ kind: EVENT.Draw }, "Draw 1 card");
  add({ kind: EVENT.Resource }, "Gain 1 resource");
  for (const h of playable(game, i)) {
    if (canPlay(game, i, h, false))
      add({ kind: EVENT.Play, card: h }, `Play ${def(game, h).name}`, h);
    else if (canPlay(game, i, h, true))
      add({ kind: EVENT.Play, card: h }, `Play ${def(game, h).name} (fast)`, h);
  }
  for (const r of activatable(game, i, ["action", "fast"])) {
    add(
      { kind: EVENT.Ability, card: r.card, index: r.index },
      r.ability.label ?? `${def(game, r.card).name}: ${r.ability.designator ?? "ability"}`,
      r.card,
    );
  }
  for (const e of enemiesAt(game, loc)) {
    if (attackable(game, e.id) && def(game, e.id).enemy?.fight !== null)
      add({ kind: "fight", enemy: e.id }, `Fight ${def(game, e.id).name}`, e.id);
    if (e.engagedWith !== i && !isMassive(game, e.id))
      add({ kind: EVENT.Engage, enemy: e.id }, `Engage ${def(game, e.id).name}`, e.id);
  }
  for (const e of engagedWith(game, i))
    if (def(game, e.id).enemy?.evade !== null)
      add({ kind: EVENT.Evade, enemy: e.id }, `Evade ${def(game, e.id).name}`, e.id);
  // Veiled: with no clues on it, its other side may be turned up and resolved
  if (loc && hasKeyword(game, loc, "veiled") && card(game, loc).clues === 0 && def(game, loc).back)
    add(
      { kind: "flipVeiled", location: loc },
      `Flip ${def(game, loc).name}`,
      loc,
      "option.flipVeiled",
    );
  // a vehicle here: in (unless forbidden) or out, once each per round
  const blocked = noVehicles.get(game);
  if (me.vehicle) {
    if (vehicleUsed.get(game, `${i}:leave`) !== currentRound(game))
      add(
        { kind: "leaveVehicle" },
        `Leave ${def(game, me.vehicle).name}`,
        me.vehicle,
        "option.leaveVehicle",
      );
  } else if (vehicleUsed.get(game, `${i}:enter`) !== currentRound(game) && blocked !== true)
    for (const v of cardsIn(game, ZONE.Play).filter(
      (c) =>
        c.location === loc &&
        !!loc &&
        hasKeyword(game, c.id, "vehicle") &&
        !(Array.isArray(blocked) && blocked.includes(loc)),
    ))
      add(
        { kind: "enterVehicle", vehicle: v.id },
        `Enter ${def(game, v.id).name}`,
        v.id,
        "option.enterVehicle",
      );
  // each act deck the group can advance by spending clues (Threads of Fate's three)
  for (const deck of advanceableActs(game))
    add(
      deck === "a" ? { kind: "advanceAct" } : { kind: "advanceAct", deck },
      `Advance act (spend ${actClueCost(game, deck)} clues as a group)`,
      currentAct(game, deck)!,
    );
  out.push({
    id: JSON.stringify({ kind: "endTurn" }),
    label: "End turn",
    value: { kind: "endTurn" },
  });
  return out;
}

export { spendableGroupClues };

export const turnHandler: Handler<"Turn"> = (game, step) => {
  const me = inv(game, step.inv);
  if (me.status !== "playing" || currentPhase(game) === "ended" || me.turnDone) return;
  const opts = legalTurnActions(game, step.inv);
  const a = ask<TurnAction>(
    game,
    step,
    step.inv,
    CHOICE.Turn,
    `${me.name}: choose an action (${me.actionsLeft} left)`,
    opts,
    { key: "turn", vars: { actions: me.actionsLeft } },
  );
  if (a === undefined) return;
  if (a.kind === "endTurn") {
    push(game, { t: STEP.EndTurn, inv: step.inv });
    return;
  }
  push(game, { t: STEP.PerformAction, inv: step.inv, action: a }, { t: STEP.Turn, inv: step.inv });
};

export const endTurnHandler: Handler<"EndTurn"> = (game, step) => {
  const me = inv(game, step.inv);
  if (me.turnDone) return;
  setTurnDone(game, me.id, true);
  push(game, win("turnEnds", { inv: step.inv }), { t: STEP.EndTurnCleanup, inv: step.inv });
};

export function endTurnCleanup(game: GameContext, i: InvId) {
  // effects that waited for the end of this turn (Prestidigitation)
  const waiting = atTurnEnd.get(game) ?? [];
  const due = waiting.filter((d) => d.inv === i);
  if (due.length) {
    atTurnEnd.set(
      game,
      waiting.filter((d) => d.inv !== i),
    );
    push(game, ...due.map((d): Step => ({ t: STEP.Effects, effects: d.effects, ctx: d.ctx })));
  }
  expireMods(game, "turn");
  if (activeInvestigator(game) === i) setActive(game, null);
}

const NO_AOO = ["fight", "evade", "parley", "resign"];

/** one action as if it were the investigator's turn, outside the count of their actions (Quick Thinking); or none */
export const bonusActionHandler: Handler<"BonusAction"> = (game, step) => {
  const me = inv(game, step.inv);
  if (me.status !== "playing" || currentPhase(game) === "ended") return;
  // the actions that take one action, offered as if the investigator had one left
  const left = me.actionsLeft;
  setCounter(game, me.id, "actionsLeft", 1);
  const opts = legalTurnActions(game, step.inv).filter(
    (o) => actionCost(game, step.inv, o.value as TurnAction) === 1,
  );
  setCounter(game, me.id, "actionsLeft", left);
  const a = ask<TurnAction | "none">(
    game,
    step,
    step.inv,
    CHOICE.Generic,
    `${me.name}: take an action?`,
    [...opts, { id: "none", label: "No action", value: "none", key: "option.noAction" }],
    { key: "bonusAction" },
  );
  if (a === undefined || a === "none") return;
  push(game, { t: STEP.PerformAction, inv: step.inv, action: a, free: true });
};

export const performActionHandler: Handler<"PerformAction"> = (game, step) => {
  const { inv: i, action: a } = step;
  const me = inv(game, i);
  const cost = actionCost(game, i, a);
  const designator = designatorOf(game, a);
  // spend actions (restricted actions first when they apply); a free one counts toward none (Quick Thinking)
  let left = step.free ? 0 : cost;
  me.restrictedActions.forEach((r, index) => {
    if (left > 0 && restrictedFits(game, i, r, a, designator)) {
      const n = Math.min(left, r.left);
      spendRestricted(game, i, index, n);
      left -= n;
    }
  });
  addCounter(game, me.id, "actionsLeft", -left);
  if (cost > 0) noteAction(game, i, designator);
  const steps: Step[] = [];
  // Dr. Henry Armitage: the first action each round provokes none
  const firstFree = hasFlag(game, i, "firstActionNoAoO") && me.actionsThisRound.length === 1;
  if (
    cost > 0 &&
    !firstFree &&
    !NO_AOO.includes(designator) &&
    abilityOfAction(game, a)?.aoo !== false
  )
    steps.push(...attacksOfOpportunity(game, i));
  const ctx = { you: i, inv: i };
  switch (a.kind) {
    case "investigate": {
      const loc = me.location!;
      steps.push({ t: STEP.Investigate, inv: i, location: loc });
      break;
    }
    case "move": {
      const clues = enterCost(game, a.to);
      if (clues) spendGroupClues(game, clues);
      steps.push({ t: STEP.Move, inv: i, to: a.to });
      break;
    }
    case "draw":
      emit(game, EVENT.Action, `${me.name} takes the draw action`, { inv: i });
      // choosing the Draw action is the tap on the deck: no second wait
      steps.push({ t: STEP.Draw, inv: i, n: 1, tapped: true });
      break;
    case "resource":
      if (!cannotGainResources(game, i)) addCounter(game, me.id, "resources", 1);
      emit(game, EVENT.Resource, `${me.name} gains 1 resource`, { inv: i, data: { n: 1 } });
      break;
    case "play":
      steps.push({ t: STEP.PlayCard, inv: i, card: a.card });
      break;
    case "ability":
      steps.push({ t: STEP.UseAbility, inv: i, card: a.card, index: a.index });
      break;
    case "fight":
      steps.push({ t: STEP.BasicFight, ctx: { ...ctx, enemy: a.enemy } });
      break;
    case "evade":
      steps.push({ t: STEP.BasicEvade, ctx: { ...ctx, enemy: a.enemy } });
      break;
    case "engage":
      steps.push({ t: STEP.EnemyEngage, enemy: a.enemy, inv: i });
      break;
    case "advanceAct":
      steps.push(
        a.deck
          ? { t: STEP.AdvanceAct, spend: true, deck: a.deck }
          : { t: STEP.AdvanceAct, spend: true },
      );
      break;
    case "enterVehicle":
      steps.push({ t: STEP.EnterVehicle, inv: i, vehicle: a.vehicle });
      break;
    case "leaveVehicle":
      steps.push({ t: STEP.LeaveVehicle, inv: i });
      break;
    case "flipVeiled":
      steps.push(
        { t: STEP.Flip, card: a.location },
        { t: STEP.ResolveStory, card: a.location, you: i },
      );
      break;
  }
  steps.push({ t: STEP.CheckObjectives });
  push(game, ...steps);
};

export function basicInvestigate(
  game: GameContext,
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
    boost?: Boost;
    baseSkill?: number;
    extraClues?: number;
  } = {},
) {
  const skill = extra.skill ?? def(game, loc).investigateSkill ?? "intellect";
  startTest(game, {
    inv: i,
    skill,
    kind: "investigate",
    target: loc,
    source: extra.source ?? null,
    label: `Investigate ${def(game, loc).name}`,
    skillBonus: extra.bonus,
    shroudMod: extra.shroud,
    insteadOfClues: extra.insteadOfClues,
    onSuccess: extra.onSuccess,
    onFail: extra.onFail,
    onTokens: extra.onTokens,
    boost: extra.boost,
    baseSkill: extra.baseSkill,
    extraClues: extra.extraClues,
    ctx: { you: i, location: loc, source: extra.source ?? null },
  });
}

// ---------- enemy phase ----------
export const enemyPhaseHandler: Handler<"EnemyPhase"> = (game) => {
  if (currentPhase(game) === "ended") return;
  beginPhase(game, PHASE.Enemy);
  push(
    game,
    win("phaseBegins", { phase: "enemy" }),
    { t: STEP.PatrolMoves },
    { t: STEP.HunterMoves },
    win("playerWindow", { phase: "enemy" }),
    { t: STEP.EnemyAttacks },
    { t: STEP.PredatorAttacks },
    win("enemyPhaseEnds", {}),
  );
};

// ---------- upkeep ----------
export function readyAll(game: GameContext) {
  const mods = allMods(game);
  for (const c of allCards(game)) {
    // an enemy kept from readying this upkeep (Slippery)
    if (noReady.get(game, c.id)) {
      noReady.clear(game, c.id);
      continue;
    }
    if (
      isOneOf(
        c.zone,
        ZONE.Play,
        ZONE.Enemy,
        ZONE.Location,
        ZONE.Attached,
        ZONE.Investigator,
        ZONE.Threat,
      ) &&
      canReady(game, c.id, mods)
    )
      ready(game, c.id);
  }
  emit(game, EVENT.Ready, "All exhausted cards are readied");
}

export const upkeepHandler: Handler<"UpkeepPhase"> = (game) => {
  if (currentPhase(game) === "ended") return;
  beginPhase(game, PHASE.Upkeep);
  logStep(game, "upkeep");
  // the player window comes before exhausted cards ready (Grimoire, 4.1 to 4.3)
  const steps: Step[] = [
    win("phaseBegins", { phase: "upkeep" }),
    win("playerWindow", { phase: "upkeep" }),
    // "when attached enemy would ready" (Bind Monster)
    ...enemies(game)
      .filter((e) => e.exhausted)
      .map((e) => win("enemyWouldReady", { enemy: e.id })),
    { t: STEP.ReadyAll },
  ];
  // readied enemies at an investigator's location engage
  for (const i of activeInvs(game)) steps.push({ t: STEP.CheckEngagement, inv: i });
  const mods = allMods(game);
  for (const i of turnOrder(game)) {
    if (inv(game, i).status !== "playing") continue;
    // the VIP Area: no upkeep draw or resource there
    if (!hasFlag(game, i, "noUpkeepDraw", mods)) steps.push({ t: STEP.Draw, inv: i, n: 1 });
    if (!hasFlag(game, i, "noUpkeepResources", mods)) steps.push({ t: STEP.GainResource, inv: i });
  }
  for (const i of turnOrder(game)) steps.push({ t: STEP.HandSize, inv: i });
  // "at the end of the upkeep phase" (Hired Muscle)
  steps.push(win("upkeepPhaseEnds", {}));
  push(game, ...steps);
};

export const endRoundHandler: Handler<"EndRound"> = (game) => {
  if (currentPhase(game) === "ended") return;
  // "until the end of the round" effects expire before "at the end of the round" abilities (Grimoire, Lasting Effects)
  push(game, { t: STEP.RoundCleanup }, win("roundEnds", {}), {
    t: STEP.StartRound,
  });
};

export function roundCleanup(game: GameContext) {
  expireMods(game, "round");
  // "at the end of the round, if that asset is still in play, discard it" (A Chance Encounter)
  for (const id of discardAtRoundEnd.get(game) ?? [])
    if (cardIf(game, id)?.zone === ZONE.Play) discard(game, id);
  discardAtRoundEnd.clear(game);
}

/** the step that starts each phase, and the round's end: where a phase's own steps stop */
const PHASE_STEPS: readonly Step["t"][] = [
  STEP.PhasePause,
  STEP.MythosPhase,
  STEP.InvestigationPhase,
  STEP.EnemyPhase,
  STEP.UpkeepPhase,
  STEP.EndRound,
];
const PHASE_STEP = {
  mythos: STEP.MythosPhase,
  investigation: STEP.InvestigationPhase,
  enemy: STEP.EnemyPhase,
  upkeep: STEP.UpkeepPhase,
} as const;

/** the rest of the phase that has just begun does not happen (The Gold Pocket Watch) */
export function skipPhase(game: GameContext) {
  dropQueuedUntil(game, (s) => PHASE_STEPS.includes(s.t));
}

/** the phase that has just ended happens once more, now (The Gold Pocket Watch) */
export function repeatPhase(game: GameContext, phase: keyof typeof PHASE_STEP) {
  push(game, { t: PHASE_STEP[phase] } as Step);
}

export { checkEngagement };

/** the basic Fight or Evade action against the context's enemy */
function basicTest(game: GameContext, ctx: EffCtx, kind: "fight" | "evade") {
  const fight = kind === "fight";
  startTest(game, {
    inv: ctx.you!,
    skill: fight ? "combat" : "agility",
    kind,
    target: ctx.enemy!,
    label: `${fight ? "Fight" : "Evade"} ${def(game, ctx.enemy!).name}`,
    ctx,
  });
}

export const handlers = {
  Investigate: (game: GameContext, step: StepOf<"Investigate">) =>
    basicInvestigate(game, step.inv, step.location),
  BasicFight: (game: GameContext, step: StepOf<"BasicFight">) => basicTest(game, step.ctx, "fight"),
  BasicEvade: (game: GameContext, step: StepOf<"BasicEvade">) => basicTest(game, step.ctx, "evade"),
  EndTurnCleanup: (game: GameContext, step: StepOf<"EndTurnCleanup">) =>
    endTurnCleanup(game, step.inv),
  GainResource: (game: GameContext, step: StepOf<"GainResource">) => {
    if (cannotGainResources(game, step.inv)) return;
    // Jenny Barnes collects 1 more
    const n = 1 + modSum(game, step.inv, "upkeepResources");
    // Dark Horse: "you may choose to not gain resources"
    if (hasFlag(game, step.inv, "mayDeclineUpkeepResources")) {
      const gain = ask<boolean>(
        game,
        step,
        step.inv,
        CHOICE.Generic,
        `Gain ${n} resources in the upkeep phase?`,
        [
          {
            id: "gain",
            label: `Gain ${n} resources`,
            value: true,
            key: "option.gainResources",
            vars: { n },
          },
          { id: "decline", label: "Gain none", value: false, key: "option.gainNone" },
        ],
        { key: "upkeepResources", vars: { n } },
      );
      if (!gain) return;
    }
    addCounter(game, step.inv, "resources", n);
  },
  RoundCleanup: (game: GameContext) => roundCleanup(game),
  ReadyAll: (game: GameContext) => readyAll(game),
  StartRound: startRoundHandler,
  PhasePause: phasePauseHandler,
  MythosPhase: mythosHandler,
  MythosDraw: mythosDrawHandler,
  InvestigationPhase: investigationHandler,
  NextTurn: nextTurnHandler,
  Turn: turnHandler,
  EndTurn: endTurnHandler,
  PerformAction: performActionHandler,
  BonusAction: bonusActionHandler,
  EnemyPhase: enemyPhaseHandler,
  UpkeepPhase: upkeepHandler,
  EndRound: endRoundHandler,
};
