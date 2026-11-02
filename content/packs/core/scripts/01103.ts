// Stubborn Detective — while at your location, your investigator's text box is blank
import {
  card,
  type CardScript,
  type GameContext,
  type InstId,
  invIf,
} from "../../../../src/engine/api";

export default {
  blanks(game: GameContext, cardId: InstId) {
    const c = card(game, cardId);
    const bearer = c.owner ? invIf(game, c.owner) : null;
    return c.zone === "enemy" && bearer && bearer.location === c.location ? [bearer.cardId] : [];
  },
} satisfies CardScript;
