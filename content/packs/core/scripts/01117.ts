// Lita Chantler — investigators at her controller's location deal +1 damage when attacking a Monster
import { card, def, type CardScript, type G, type InstId } from "../../../../src/engine/api";

export default {
  modifiers(g: G, id: InstId) {
    const lita = card(g, id);
    const t = g.s.skillTest;
    if (lita.zone !== "play" || !lita.controller || !t || t.kind !== "fight" || !t.target)
      return [];
    if (!def(g, t.target).traits.includes("Monster")) return [];
    if (g.s.invs[t.inv]?.location !== g.s.invs[lita.controller]?.location) return [];
    return [{ target: t.inv, mod: { stat: "attackDamage" as const, value: 1 } }];
  },
} satisfies CardScript;
