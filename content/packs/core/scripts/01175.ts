// Screeching Byakhee — +1 fight and +1 evade while engaged with an investigator with 4 or less remaining sanity
import { card, def, inv, type CardScript, type G, type InstId } from "../../../../src/engine/api";

export default {
  modifiers(g: G, id: InstId) {
    const c = card(g, id);
    if (c.zone !== "enemy" || !c.engagedWith) return [];
    const i = inv(g, c.engagedWith);
    // printed sanity: modified sanity would recurse into modifier collection
    if ((def(g, i.cardId).sanity ?? 0) - i.horror > 4) return [];
    return [
      { target: id, mod: { stat: "fight" as const, value: 1 } },
      { target: id, mod: { stat: "evade" as const, value: 1 } },
    ];
  },
} satisfies CardScript;
