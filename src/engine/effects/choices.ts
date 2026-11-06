/** Effects that ask for a choice, end a scenario or run a card's script. */
import { atTurnEnd } from "../world/flags";
import {
  ask,
  cancelEvent,
  card,
  type GameContext,
  leadInvestigator,
  push,
  scenarioIdOf,
} from "../context";
import { checkCondition, matchesFilter } from "../queries";
import type { EffectOf, EffectRun } from "./types";
import type { Step } from "../world/types";
import { enemyTargets, invTargets } from "./targets";
import { CHOICE } from "../world/constants";
import { STEP } from "../steps/step";
import { scriptFnFor } from "../world/scripts";

function chooseOneEffect(game: GameContext, run: EffectRun<EffectOf<"chooseOne">>) {
  const { step, ctx, you } = run;
  const e = run.effect;

  const opts = e.options.filter((o) => !o.condition || checkCondition(game, o.condition, ctx));
  if (!opts.length) return;
  const who = e.chooser === "lead" ? leadInvestigator(game) : you;
  const pick = ask<number>(
    game,
    step,
    who,
    CHOICE.Generic,
    "Choose one:",
    opts.map((o, k) => ({ id: String(k), label: o.label, value: k })),
    { auto: true, key: "chooseOne" },
  );
  if (pick === undefined) return;
  push(game, { t: STEP.Effects, effects: opts[pick].effects, ctx });
  return;
}

function cancelEffect(game: GameContext, run: EffectRun<EffectOf<"cancel">>) {
  const { ctx } = run;

  if (ctx.key) cancelEvent(game, ctx.key);
  return;
}

function resolutionEffect(game: GameContext, run: EffectRun<EffectOf<"resolution">>) {
  const e = run.effect;

  push(game, { t: STEP.Resolution, id: e.id });
  return;
}

function resignEffect(game: GameContext, run: EffectRun<EffectOf<"resign">>) {
  const { you } = run;

  push(game, { t: STEP.Defeated, inv: you, by: "resign" });
  return;
}

function atTurnEndEffect(game: GameContext, run: EffectRun<EffectOf<"atTurnEnd">>) {
  const { ctx, you } = run;
  const e = run.effect;

  atTurnEnd.set(game, [...(atTurnEnd.get(game) ?? []), { inv: you, effects: e.effects, ctx }]);
  return;
}

function scriptEffect(game: GameContext, run: EffectRun<EffectOf<"script">>) {
  const { ctx, src } = run;
  const e = run.effect;

  const code = src?.code ?? scenarioIdOf(game);
  push(game, {
    t: STEP.Script,
    code: scriptFnFor(game.db, scenarioIdOf(game), code, e.fn)?.code ?? scenarioIdOf(game),
    fn: e.fn,
    ctx,
    args: e.args,
  });
  return;
}

/** effects for an investigator chosen by `target`, who is "you" in them (Liquid Courage's healed investigator) */
function forInvestigatorEffect(game: GameContext, run: EffectRun<EffectOf<"forInvestigator">>) {
  const { step, ctx } = run;
  const ts = invTargets(game, step, run.effect.target, ctx);
  if (!ts) return;
  push(
    game,
    ...ts.map((i): Step => ({
      t: STEP.Effects,
      effects: run.effect.effects,
      ctx: { ...ctx, you: i, inv: i },
    })),
  );
}

/** effects with an enemy chosen by `target` (matching the filter) as the event's enemy (Anatomical Diagrams) */
function forEnemyEffect(game: GameContext, run: EffectRun<EffectOf<"forEnemy">>) {
  const { step, ctx } = run;
  const f = run.effect.filter;
  const ts = enemyTargets(
    game,
    step,
    run.effect.target,
    ctx,
    (id) => !f || matchesFilter(game, card(game, id).code, f),
  );
  if (!ts) return;
  push(
    game,
    ...ts.map((enemy): Step => ({
      t: STEP.Effects,
      effects: run.effect.effects,
      ctx: { ...ctx, enemy },
    })),
  );
}

export const choicesEffects = {
  forInvestigator: forInvestigatorEffect,
  forEnemy: forEnemyEffect,
  chooseOne: chooseOneEffect,
  cancel: cancelEffect,
  resolution: resolutionEffect,
  resign: resignEffect,
  atTurnEnd: atTurnEndEffect,
  script: scriptEffect,
};
