// Echoes of the Past's reference card — what its cards ask of the scenario (Return to Echoes of the Past plays with
// this card too): the Quiet Halls' "If each location in play is revealed and there are no clues on locations in play".
import { type CardScript, type GameContext, locations } from "../../../../src/engine/api";

export default {
  conditions: {
    allRevealedNoClues: (game: GameContext) => locations(game).every((l) => l.revealed && !l.clues),
  },
} satisfies CardScript;
