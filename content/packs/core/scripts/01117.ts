// Lita Chantler — investigators at her controller's location deal +1 damage when attacking a Monster
import {
  card,
  type CardScript,
  currentTest,
  def,
  type G,
  type InstId,
  invIf,
} from "../../../../src/engine/api";

export default {
  modifiers(g: G, id: InstId) {
    const lita = card(g, id);
    const t = currentTest(g);
    if (lita.zone !== "play" || !lita.controller || !t || t.kind !== "fight" || !t.target)
      return [];
    if (!def(g, t.target).traits.includes("Monster")) return [];
    if (invIf(g, t.inv)?.location !== invIf(g, lita.controller)?.location) return [];
    return [{ target: t.inv, mod: { stat: "attackDamage" as const, value: 1 } }];
  },
} satisfies CardScript;
