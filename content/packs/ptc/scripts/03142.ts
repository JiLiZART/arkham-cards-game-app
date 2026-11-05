// Clasp of Black Onyx — while it is in your hand, each other card in your hand costs 1 more.
import {
  card,
  type CardScript,
  type GameContext,
  type InstId,
  inv,
} from "../../../../src/engine/api";

export default {
  inHandModifiers(game: GameContext, cardId: InstId) {
    const holder = card(game, cardId).owner;
    if (!holder) return [];
    const others = inv(game, holder)
      .hand.filter((id) => id !== cardId)
      .map((id) => card(game, id).code)
      .filter((code) => code !== card(game, cardId).code);
    return others.length
      ? [{ target: holder, mod: { stat: "cost" as const, value: 1, filter: { code: others } } }]
      : [];
  },
} satisfies CardScript;
