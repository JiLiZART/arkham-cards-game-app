// Frozen in Fear — the first move, fight or evade each round costs 1 additional action
import { card, inv, type CardScript, type G, type InstId, type InvId } from "../../../../src/engine/api";

const SLOWED = ["move", "fight", "evade"];

export default {
  extraActionCost(g: G, cardId: InstId, i: InvId, designator: string) {
    if (card(g, cardId).controller !== i || card(g, cardId).zone !== "threat" || !SLOWED.includes(designator)) return 0;
    return inv(g, i).actionsThisRound.some((d) => SLOWED.includes(d)) ? 0 : 1;
  },
} satisfies CardScript;
