// Arcane Lock — entering or leaving the attached location costs 1 more action
import { card, type CardScript, type GameContext, inv } from "../../../../src/engine/api";

export default {
  extraActionCost(
    game: GameContext,
    cardId: string,
    i: string,
    designator: string,
    action?: { kind: string; to?: string },
  ) {
    if (designator !== "move") return 0;
    const loc = card(game, cardId).location;
    return loc && (inv(game, i).location === loc || action?.to === loc) ? 1 : 0;
  },
} satisfies CardScript;
