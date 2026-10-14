// Stubborn Detective — while at your location, your investigator's text box is blank
import { card, type CardScript, type G, type InstId } from "../../../../src/engine/api";

export default {
  blanks(g: G, cardId: InstId) {
    const c = card(g, cardId);
    const bearer = c.owner ? g.s.invs[c.owner] : null;
    return c.zone === "enemy" && bearer && bearer.location === c.location ? [bearer.cardId] : [];
  },
} satisfies CardScript;
