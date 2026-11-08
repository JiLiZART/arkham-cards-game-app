// The Throne Room (Return to Dim Carcosa): Hastur there cannot leave it, be exhausted or make attacks of opportunity.
// Its story is The Entity (52062b).
import { type CardScript, type GameContext, type InstId } from "../../../../src/engine/api";
import { hastur } from "../../../campaigns/the-path-to-carcosa/scripts/dim-carcosa";

const FLAGS = ["cannotMove", "cannotBeExhausted", "noAttacksOfOpportunity"] as const;

export default {
  modifiers(game: GameContext, self: InstId) {
    const h = hastur(game);
    return h?.location === self ? FLAGS.map((flag) => ({ target: h.id, mod: { flag } })) : [];
  },
} satisfies CardScript;
