// Search For the Stranger (v. II) (Dim Carcosa, act 2): each investigator cannot discover clues; The Man in the Pallid
// Mask cannot be defeated except by his [action] ability, and that defeat advances the act instead (the scenario's
// would-be-defeated hook). Back (Figment of Your Imagination): Hastur (The King in Yellow) is put into play next to the
// act deck, at no location; The Man in the Pallid Mask leaves the game.
import {
  type CardScript,
  emit,
  findByCode,
  type GameContext,
  moveCard,
  EVENT,
  ZONE,
} from "../../../../src/engine/api";
import { KING_IN_YELLOW } from "../../../campaigns/the-path-to-carcosa/scripts/dim-carcosa";
import { noClues, removeStranger } from "./03321a";

export default {
  abilities: [{ kind: "revelation", run: "figment" }],
  modifiers: noClues,
  fns: {
    figment(game: GameContext) {
      const king = findByCode(game, KING_IN_YELLOW, [ZONE.SetAside]);
      if (king) {
        moveCard(game, king.id, ZONE.Enemy, { location: null });
        emit(game, EVENT.Spawn, "Hastur (The King in Yellow) is in play, at no location", {
          card: king.id,
        });
      }
      removeStranger(game);
    },
  },
} satisfies CardScript;
