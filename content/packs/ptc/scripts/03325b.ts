// Songs That the Hyades Shall Sing (Dim Carcosa, the story of Shores of Hali): 1 damage per investigator to Hastur,
// who is exhausted and disengaged; the card flips back and can't be flipped again.
import {
  type CardScript,
  type GameContext,
  type ScriptRun,
  queue,
  runScript,
} from "../../../../src/engine/api";
import { damageHastur, lock } from "../../../campaigns/the-path-to-carcosa/scripts/dim-carcosa";

export default {
  abilities: [{ kind: "revelation", run: "songs" }],
  fns: {
    songs(game: GameContext, run: ScriptRun) {
      lock(game, run.source);
      queue(
        game,
        ...damageHastur(game, run.source, 1),
        runScript({ code: "dim-carcosa", fn: "stunHastur", ctx: { source: null } }),
      );
    },
  },
} satisfies CardScript;
