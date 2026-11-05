// Roach Swarm — its fight value X is the shroud value of its location (its printed fight is 0 in the card data).
import {
  card,
  type CardScript,
  type GameContext,
  type InstId,
  shroud,
  ZONE,
} from "../../../../src/engine/api";

/** the shroud is read through every modifier in play, this one's too: the swarm adds nothing while it is read */
let reading = false;

export default {
  modifiers(game: GameContext, cardId: InstId) {
    const c = card(game, cardId);
    if (reading || c.zone !== ZONE.Enemy || !c.location) return [];
    reading = true;
    try {
      const x = shroud(game, c.location);
      return Number.isFinite(x)
        ? [{ target: cardId, mod: { stat: "fight" as const, value: x } }]
        : [];
    } finally {
      reading = false;
    }
  },
} satisfies CardScript;
