// Slithering Behind You — if Hunting Horror is in play, 1 doom on it; otherwise it is found in the encounter deck, its
// discard pile or the void and spawns at your location, engaged with you. The encounter deck is shuffled
import {
  type CardScript,
  type GameContext,
  shuffleDeck,
  type ScriptRun,
} from "../../../../src/engine/api";
import { doomOnHorror, spawnHorror } from "./02141";

export default {
  abilities: [{ kind: "revelation", run: "slither" }],
  fns: {
    slither(game: GameContext, run: ScriptRun) {
      if (!doomOnHorror(game, run)) spawnHorror(game, { engage: run.you });
      shuffleDeck(game, "encounter");
    },
  },
} satisfies CardScript;
