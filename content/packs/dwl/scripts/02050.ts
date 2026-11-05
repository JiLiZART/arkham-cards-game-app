// Orne Library — investigating it costs 1 additional action
import {
  card,
  type CardScript,
  type GameContext,
  inv,
  type InstId,
  type InvId,
} from "../../../../src/engine/api";

export default {
  extraActionCost(game: GameContext, id: InstId, i: InvId, designator: string) {
    const library = card(game, id);
    return designator === "investigate" && library.revealed && inv(game, i).location === id ? 1 : 0;
  },
} satisfies CardScript;
