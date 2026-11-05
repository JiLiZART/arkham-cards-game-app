// The Archway (Dim Carcosa, the story of Dim Streets): test [willpower] (1), heal 1 horror for each point you succeed
// by. Then another set-aside copy of Dim Streets takes this one's place.
import {
  type CardScript,
  type GameContext,
  type ScriptRun,
  queue,
  resolveEffect,
  runScript,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "archway" }],
  fns: {
    archway(game: GameContext, run: ScriptRun) {
      queue(
        game,
        resolveEffect({
          effect: {
            op: "skillTest",
            skill: "willpower",
            difficulty: 1,
            onSuccess: [{ op: "heal", horror: "succeedBy" }],
          },
          ctx: run.ctx,
        }),
        runScript({ code: "dim-carcosa", fn: "replace", ctx: run.ctx }),
      );
    },
  },
} satisfies CardScript;
