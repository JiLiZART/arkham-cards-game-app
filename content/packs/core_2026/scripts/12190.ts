// Blasphemous Invocation — per point failed, 1 doom on a Cultist with no doom; none placed: draw a Cultist from the encounter deck or discard
import {
  def,
  enemies,
  type CardScript,
  type GameContext,
  type ScriptRun,
  argField,
  asNumber,
  queue,
  placeDoom,
  checkDoom,
  runScript,
  resolveEffect,
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
        queue(
          game,
          placeDoom({ card: pick, n: 1 }),
          checkDoom(),
          runScript({
            code: "12190",
            fn: "blaspheme",
            ctx: run.ctx,
            args: { left: left - 1, placed: placed + 1 },
          }),
        );
        return;
      }
      if (!placed)
        queue(
          game,
          resolveEffect({
            effect: { op: "searchEncounterDraw", filter: { type: "enemy", trait: "Cultist" } },
            ctx: run.ctx,
          }),
        );
    },
  },
} satisfies CardScript;
