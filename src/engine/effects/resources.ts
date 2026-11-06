/** Effects that change a player's resources, actions and cards drawn, and the cost a card asks. */
import {
  activeInvestigator,
  addCounter,
  ask,
  currentPhase,
  def,
  emit,
  type GameContext,
  grantRestricted,
  inv,
  invName,
  limitUses,
  periodCounter,
  push,
  recordLimitUse,
  spendRestricted,
} from "../context";
import { canPay, payCost, win } from "../rules/cards";
import { cannotGainResources, controlled, invsAt } from "../queries";
import { amt, invTargets } from "./targets";
import type { EffectOf, EffectRun } from "./types";
import { EVENT } from "../events/event";
import { STEP } from "../steps/step";
import { CHOICE, PHASE } from "../world/constants";
import { actionsOwed } from "../world/flags";
import type { InvId } from "../world/types";

function changeResourcesOrDrawEffect(
  game: GameContext,
  run: EffectRun<EffectOf<"gainResources" | "loseResources" | "drawCards">>,
) {
  const { step, ctx } = run;
  const e = run.effect;

  const ts = invTargets(game, step, e.target, ctx);
  if (!ts) return;
  for (const i of ts) {
    const me = inv(game, i);
    const n = amt(game, e.amount, ctx);
    if (e.op === "gainResources") {
      if (cannotGainResources(game, i)) continue;
      addCounter(game, me.id, "resources", n);
      emit(game, EVENT.Resource, `${me.name} gains ${n} resources`, { inv: i, data: { n } });
    } else if (e.op === "loseResources") {
      const lost = Math.min(n, me.resources);
      addCounter(game, me.id, "resources", -lost);
      emit(game, EVENT.Resource, `${me.name} loses ${lost} resources`, {
        inv: i,
        data: { n: lost, lost: true, source: ctx.source ?? null },
      });
    } else push(game, { t: STEP.Draw, inv: i, n });
  }
  return;
}

function gainActionsEffect(game: GameContext, run: EffectRun<EffectOf<"gainActions">>) {
  const { you, src } = run;
  const e = run.effect;

  // "Once per turn, … you may take an additional action this turn" (.41 Derringer 2)
  if (e.oncePerTurn && src) {
    const key = `${src.id}:gainActions:${periodCounter(game, "turn")}`;
    if (limitUses(game, key)) return;
    recordLimitUse(game, key);
  }
  if (e.onlyFor) grantRestricted(game, you, { designator: e.onlyFor, left: e.amount });
  else if (e.amount >= 0) addCounter(game, you, "actionsLeft", e.amount);
  else spendActions(game, you, -e.amount);
  emit(game, EVENT.Actions, `${invName(game, you)} gains ${e.amount} action(s)`, {
    inv: you,
    data: { n: e.amount },
  });
  return;
}

/** losing actions: from normal actions first, then restricted ones, never below 0 */
export function spendActions(game: GameContext, i: InvId, n: number) {
  const me = inv(game, i);
  let lose = n;
  const k = Math.min(lose, me.actionsLeft);
  addCounter(game, me.id, "actionsLeft", -k);
  lose -= k;
  me.restrictedActions.forEach((r, index) => {
    const m = Math.min(lose, r.left);
    spendRestricted(game, i, index, m);
    lose -= m;
  });
}

const onTurn = (game: GameContext, i: InvId) =>
  activeInvestigator(game) === i && currentPhase(game) === PHASE.Investigation;

/** actions lost now during the investigator's turn, else owed by their next turn */
function loseActionsEffect(game: GameContext, run: EffectRun<EffectOf<"loseActions">>) {
  const ts = invTargets(game, run.step, run.effect.target, run.ctx);
  if (!ts) return;
  for (const i of ts) {
    // "all of your remaining actions": what is left of your turn (none outside it)
    const all = run.effect.amount === "all";
    const n = all
      ? onTurn(game, i)
        ? inv(game, i).actionsLeft
        : 0
      : amt(game, run.effect.amount, run.ctx);
    if (n <= 0) continue;
    if (onTurn(game, i)) spendActions(game, i, n);
    else actionsOwed.add(game, i, n);
    emit(game, EVENT.Actions, `${invName(game, i)} loses ${n} action(s)`, {
      inv: i,
      data: { n: -n },
    });
  }
}

function endTurnEffect(game: GameContext, run: EffectRun<EffectOf<"endTurn">>) {
  if (onTurn(game, run.you)) push(game, { t: STEP.EndTurn, inv: run.you });
}

/** clues from the token bank: gained, not discovered */
function gainCluesEffect(game: GameContext, run: EffectRun<EffectOf<"gainClues">>) {
  const ts = invTargets(game, run.step, run.effect.target, run.ctx);
  if (!ts) return;
  for (const i of ts) {
    const n = amt(game, run.effect.amount, run.ctx);
    if (n <= 0) continue;
    addCounter(game, i, "clues", n);
    emit(game, EVENT.Clues, `${invName(game, i)} gains ${n} clue${n === 1 ? "" : "s"}`, {
      inv: i,
      data: { n },
    });
    push(game, win("cluesGained", { inv: i, amount: n }));
  }
}

/** one point at a time, until none is left: a resource, or a token on an asset at your location with uses of that kind */
function distributeUsesEffect(game: GameContext, run: EffectRun<EffectOf<"distributeUses">>) {
  const { step, you } = run;
  const e = run.effect;
  const left = e.left ?? e.amount;
  if (left <= 0) return;
  const assets = invsAt(game, inv(game, you).location)
    .flatMap((i) => controlled(game, i))
    .filter((c) => def(game, c.id).uses?.type === e.usesType);
  const pick = assets.length
    ? ask<string>(
        game,
        step,
        you,
        CHOICE.Generic,
        `Gain 1 resource or place 1 ${e.usesType} token (${left} left)`,
        [
          {
            id: "resource",
            label: "Gain 1 resource",
            value: "resource",
            key: "option.gainResource",
          },
          ...assets.map((a) => ({
            id: a.id,
            label: `Place 1 ${e.usesType} on ${def(game, a.id).name}`,
            card: a.id,
            value: a.id,
            key: "option.placeUse",
            vars: { card: a.id, uses: e.usesType },
          })),
        ],
        { key: "distributeUses", vars: { n: left, uses: e.usesType } },
      )
    : "resource";
  if (pick === undefined) return;
  // with no asset to take a token, every point left is a resource
  const n = assets.length ? 1 : left;
  if (pick === "resource") {
    if (!cannotGainResources(game, you)) addCounter(game, you, "resources", n);
    emit(game, EVENT.Resource, `${invName(game, you)} gains ${n} resource(s)`, {
      inv: you,
      data: { n },
    });
  } else {
    addCounter(game, pick, "uses", 1);
    emit(game, EVENT.Uses, `1 ${e.usesType} is placed on ${def(game, pick).name}`, { card: pick });
  }
  if (left > n) push(game, { ...step, choice: undefined, effect: { ...e, left: left - n } });
}

function payCostEffect(game: GameContext, run: EffectRun<EffectOf<"payCost">>) {
  const { you, src } = run;
  const e = run.effect;

  if (!src || !canPay(game, you, src.id, e.cost)) return;
  push(game, ...payCost(game, you, src.id, e.cost));
  return;
}

export const resourcesEffects = {
  gainResources: changeResourcesOrDrawEffect,
  loseResources: changeResourcesOrDrawEffect,
  drawCards: changeResourcesOrDrawEffect,
  gainActions: gainActionsEffect,
  loseActions: loseActionsEffect,
  endTurn: endTurnEffect,
  gainClues: gainCluesEffect,
  payCost: payCostEffect,
  distributeUses: distributeUsesEffect,
};
