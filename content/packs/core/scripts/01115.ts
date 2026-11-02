// Parlor — unrevealed side: you cannot move into the Parlor
import { card, type CardScript, type GameContext, type InstId } from "../../../../src/engine/api";

export default {
  modifiers(game: GameContext, id: InstId) {
    return card(game, id).zone === "location" && !card(game, id).revealed
      ? [{ target: id, mod: { flag: "cannotMoveInto" as const } }]
      : [];
  },
} satisfies CardScript;
