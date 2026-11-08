// Historical Society, Boiler Room (Return to Echoes of the Past, Basement) — after you discover 1 or more clues at it you
// draw that many encounter cards, one at a time.
import {
  type CardScript,
  type GameContext,
  queue,
  resolveEffect,
  type ScriptRun,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "forced", trigger: "cluesDiscovered", run: "boiler" }],
  fns: {
    boiler(game: GameContext, run: ScriptRun) {
      const you = run.ctx.inv;
      const n = run.ctx.x ?? 0;
      if (!you || n <= 0) return;
      const ctx = { ...run.ctx, you };
      queue(
        game,
        ...Array.from({ length: n }, () =>
          resolveEffect({ effect: { op: "drawEncounterCard" }, ctx }),
        ),
      );
    },
  },
} satisfies CardScript;
