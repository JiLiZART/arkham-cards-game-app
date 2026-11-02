/** Effects that change a player's resources, actions and cards drawn, and the cost a card asks. */
import {
  addCounter,
  emit,
  type GameContext,
  grantRestricted,
  inv,
  invName,
  push,
  spendRestricted,
} from "../context";
import { canPay, payCost } from "../rules/cards";
import { amt, invTargets } from "./targets";
import type { EffectOf, EffectRun } from "./types";
import { EVENT } from "../events/event";
import { STEP } from "../steps/step";

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
  const { you } = run;
  const e = run.effect;

  if (e.onlyFor) grantRestricted(game, you, { designator: e.onlyFor, left: e.amount });
  else if (e.amount >= 0) addCounter(game, you, "actionsLeft", e.amount);
  else {
    // losing actions: from normal actions first, then restricted ones, never below 0
    const me = inv(game, you);
    let lose = -e.amount;
    const n = Math.min(lose, me.actionsLeft);
    addCounter(game, me.id, "actionsLeft", -n);
    lose -= n;
    me.restrictedActions.forEach((r, index) => {
      const k = Math.min(lose, r.left);
      spendRestricted(game, you, index, k);
      lose -= k;
    });
  }
  emit(game, EVENT.Actions, `${invName(game, you)} gains ${e.amount} action(s)`, {
    inv: you,
    data: { n: e.amount },
  });
  return;
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
  payCost: payCostEffect,
};
