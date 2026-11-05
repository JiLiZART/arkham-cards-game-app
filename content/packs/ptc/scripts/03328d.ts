// The King's Parade (Dim Carcosa, the story of Dim Streets): test [combat] (2); a success exhausts Hastur and
// disengages him from all investigators. Then another set-aside copy of Dim Streets takes this one's place.
import {
  type CardScript,
  type GameContext,
  type ScriptRun,
  queue,
  resolveEffect,
  runScript,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "parade" }],
  fns: {
    parade(game: GameContext, run: ScriptRun) {
      queue(
        game,
        resolveEffect({
          effect: {
            op: "skillTest",
            skill: "combat",
            difficulty: 2,
            onSuccess: [{ op: "script", fn: "stunHim" }],
          },
          ctx: run.ctx,
        }),
        runScript({ code: "dim-carcosa", fn: "replace", ctx: run.ctx }),
      );
    },
    stunHim(game: GameContext) {
      queue(game, runScript({ code: "dim-carcosa", fn: "stunHastur", ctx: { source: null } }));
    },
  },
} satisfies CardScript;
