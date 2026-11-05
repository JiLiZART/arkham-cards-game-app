// Mapping the Streets (Dim Carcosa, the story of Dim Streets): test [intellect] (3), 1 horror for each point you fail
// by; 1 damage per investigator to Hastur whatever the result. After the test the card flips back and can't be
// flipped again.
import {
  type CardScript,
  type GameContext,
  type ScriptRun,
  queue,
  resolveEffect,
} from "../../../../src/engine/api";
import { damageHastur, lock } from "../../../campaigns/the-path-to-carcosa/scripts/dim-carcosa";

export default {
  abilities: [{ kind: "revelation", run: "mapping" }],
  fns: {
    mapping(game: GameContext, run: ScriptRun) {
      lock(game, run.source);
      queue(
        game,
        resolveEffect({
          effect: {
            op: "skillTest",
            skill: "intellect",
            difficulty: 3,
            perPointFailed: [{ op: "takeHorror", amount: 1 }],
          },
          ctx: run.ctx,
        }),
        ...damageHastur(game, run.source, 1),
      );
    },
  },
} satisfies CardScript;
