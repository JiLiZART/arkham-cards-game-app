// Blasphemous Invocation — per point failed, 1 doom on a Cultist with no doom; none placed: draw a Cultist from the encounter deck or discard
import {
  ask,
  def,
  enemies,
  push,
  type CardScript,
  type EffCtx,
  type GameContext,
  type InstId,
  type Step,
  CHOICE,
  STEP,
} from "../../../../src/engine/api";

export default {
  fns: {
    blaspheme(
      game: GameContext,
      ctx: EffCtx,
      args: { left: number; placed: number } | undefined,
      step?: Step,
    ) {
      const left = args?.left ?? ctx.failBy ?? 0;
      const placed = args?.placed ?? 0;
      const pool = enemies(game).filter(
        (e) => e.doom === 0 && def(game, e.id).traits.includes("Cultist"),
      );
      if (left > 0 && pool.length) {
        const pick = ask<InstId>(
          game,
          step!,
          ctx.you!,
          CHOICE.Target,
          "Blasphemous Invocation: place 1 doom on a Cultist",
          pool.map((e) => ({ id: e.id, label: def(game, e.id).name, card: e.id, value: e.id })),
          { auto: true, key: "chooseEnemy" },
        );
        if (pick === undefined) return;
        push(
          game,
          { t: STEP.PlaceDoom, card: pick, n: 1 },
          { t: STEP.CheckDoom },
          {
            t: STEP.Script,
            code: "12190",
            fn: "blaspheme",
            ctx,
            args: { left: left - 1, placed: placed + 1 },
          },
        );
        return;
      }
      if (!placed)
        push(game, {
          t: STEP.Eff,
          effect: { op: "searchEncounterDraw", filter: { type: "enemy", trait: "Cultist" } },
          ctx,
        });
    },
  },
} satisfies CardScript;
