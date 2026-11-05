// Yard — while you are investigating it, it gets +1 shroud for each horror on you. [action] If there are no clues on
// it, take 1 damage: remember that you "incited a fight amongst the patients".
import {
  card,
  type CardScript,
  currentTest,
  type GameContext,
  type InstId,
  inv,
} from "../../../../src/engine/api";

export default {
  abilities: [
    {
      kind: "action",
      usableBy: "atLocation",
      label: "Yard: take 1 damage to incite a fight amongst the patients",
      condition: { cluesOnYourLocation: "none" },
      cost: { takeDamage: 1 },
      effects: [{ op: "remember", key: "incitedAFightAmongstThePatients" }],
    },
  ],
  modifiers(game: GameContext, cardId: InstId) {
    const t = currentTest(game);
    if (!card(game, cardId).revealed || t?.kind !== "investigate") return [];
    if (inv(game, t.inv).location !== cardId) return [];
    const horror = inv(game, t.inv).horror;
    return horror ? [{ target: cardId, mod: { stat: "shroud" as const, value: horror } }] : [];
  },
} satisfies CardScript;
