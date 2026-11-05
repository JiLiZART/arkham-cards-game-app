// Marked by the Sign — peril; test [willpower] (2): a failure takes 2 horror. While The Man in the Pallid Mask is in
// play the test has +2 difficulty and the horror is direct.
import {
  type CardScript,
  enemies,
  type GameContext,
  type ScriptRun,
  queue,
  resolveEffect,
} from "../../../../src/engine/api";
import { MITPM } from "./03059";

export default {
  abilities: [{ kind: "revelation", run: "mark" }],
  fns: {
    mark(game: GameContext, run: ScriptRun) {
      const him = enemies(game).some((e) => e.code === MITPM);
      queue(
        game,
        resolveEffect({
          effect: {
            op: "skillTest",
            skill: "willpower",
            difficulty: him ? 4 : 2,
            onFail: [{ op: "takeHorror", amount: 2, ...(him ? { direct: true } : {}) }],
          },
          ctx: run.ctx,
        }),
      );
    },
  },
} satisfies CardScript;
