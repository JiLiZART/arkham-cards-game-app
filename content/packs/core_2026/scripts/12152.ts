// Waterfront District — investigating it costs 1 more action
import { type CardScript, type G } from "../../../../src/engine/api";

export default {
  extraActionCost(g: G, cardId: string, i: string, designator: string) {
    return designator === "investigate" && g.s.invs[i].location === cardId ? 1 : 0;
  },
} satisfies CardScript;
