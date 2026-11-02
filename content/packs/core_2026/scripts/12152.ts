// Waterfront District — investigating it costs 1 more action
import { type CardScript, type GameContext, inv } from "../../../../src/engine/api";

export default {
  extraActionCost(game: GameContext, cardId: string, i: string, designator: string) {
    return designator === "investigate" && inv(game, i).location === cardId ? 1 : 0;
  },
} satisfies CardScript;
