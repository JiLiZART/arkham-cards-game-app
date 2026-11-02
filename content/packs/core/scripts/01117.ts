// Lita Chantler — investigators at her controller's location deal +1 damage when attacking a Monster
import {
  card,
  type CardScript,
  currentTest,
  def,
  type GameContext,
  type InstId,
  invIf,
} from "../../../../src/engine/api";

export default {
  modifiers(game: GameContext, id: InstId) {
    const lita = card(game, id);
    const t = currentTest(game);
    if (lita.zone !== "play" || !lita.controller || !t || t.kind !== "fight" || !t.target)
      return [];
    if (!def(game, t.target).traits.includes("Monster")) return [];
    if (invIf(game, t.inv)?.location !== invIf(game, lita.controller)?.location) return [];
    return [{ target: t.inv, mod: { stat: "attackDamage" as const, value: 1 } }];
  },
} satisfies CardScript;
