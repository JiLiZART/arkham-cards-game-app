// Waterfront District — investigating it costs 1 more action
import { type CardScript, type G, inv } from "../../../../src/engine/api";

export default {
  extraActionCost(g: G, cardId: string, i: string, designator: string) {
    return designator === "investigate" && inv(g, i).location === cardId ? 1 : 0;
  },
} satisfies CardScript;
