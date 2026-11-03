// Blasphemous Invocation — per point failed, 1 doom on a Cultist with no doom; none placed: draw a Cultist from the encounter deck or discard
import {
  def,
  enemies,
  push,
  type CardScript,
  type GameContext,
  STEP,
  type ScriptRun,
  argField,
  asNumber,
} from "../../../../src/engine/api";

export default {
  fns: {
    blaspheme(game: GameContext, run: ScriptRun) {
      const left = asNumber(argField(run.args, "left")) ?? run.ctx.failBy ?? 0;
      const placed = asNumber(argField(run.args, "placed")) ?? 0;
      const pool = enemies(game).filter(
        (e) => e.doom === 0 && def(game, e.id).traits.includes("Cultist"),
      );
      if (left > 0 && pool.length) {
        const pick = run.chooseCard(
          pool.map((e) => e.id),
          { text: "Blasphemous Invocation: place 1 doom on a Cultist", key: "chooseEnemy" },
        );
        push(
          game,
          { t: STEP.PlaceDoom, card: pick, n: 1 },
          { t: STEP.CheckDoom },
          {
            t: STEP.Script,
            code: "12190",
            fn: "blaspheme",
            ctx: run.ctx,
            args: { left: left - 1, placed: placed + 1 },
          },
        );
        return;
      }
      if (!placed)
        push(game, {
          t: STEP.Eff,
          effect: { op: "searchEncounterDraw", filter: { type: "enemy", trait: "Cultist" } },
          ctx: run.ctx,
        });
    },
  },
} satisfies CardScript;
