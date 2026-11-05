// Calling Forth the Old Ones (Where Doom Awaits, agenda 1) — back: shuffle the encounter discard pile into the encounter
// deck
import { type CardScript, type GameContext, reshuffleDiscard } from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "back" }],
  fns: {
    back(game: GameContext) {
      reshuffleDiscard(game, "encounter");
    },
  },
} satisfies CardScript;
