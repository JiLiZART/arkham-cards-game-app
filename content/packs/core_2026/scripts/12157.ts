// Arcane Lock — entering or leaving the attached location costs 1 more action
import { card, type CardScript, type G, inv } from "../../../../src/engine/api";

export default {
  extraActionCost(
    g: G,
    cardId: string,
    i: string,
    designator: string,
    action?: { kind: string; to?: string },
  ) {
    if (designator !== "move") return 0;
    const loc = card(g, cardId).location;
    return loc && (inv(g, i).location === loc || action?.to === loc) ? 1 : 0;
  },
} satisfies CardScript;
