// Frozen in Fear — the first move, fight or evade each round costs 1 additional action
import {
  card,
  inv,
  type CardScript,
  type GameContext,
  type InstId,
  type InvId,
} from "../../../../src/engine/api";

const SLOWED = ["move", "fight", "evade"];

export default {
  extraActionCost(game: GameContext, cardId: InstId, i: InvId, designator: string) {
    if (
      card(game, cardId).controller !== i ||
      card(game, cardId).zone !== "threat" ||
      !SLOWED.includes(designator)
    )
      return 0;
    return inv(game, i).actionsThisRound.some((d) => SLOWED.includes(d)) ? 0 : 1;
  },
} satisfies CardScript;
