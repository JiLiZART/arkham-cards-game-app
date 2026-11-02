// Curiosity — gains [willpower][intellect] with 4+ cards in hand, twice that with 7+
import { card, inv, type CardScript, type GameContext } from "../../../../src/engine/api";

export default {
  icons(game: GameContext, id: string) {
    const i = card(game, id).owner;
    if (!i) return {};
    const hand = inv(game, i).hand.filter((h) => h !== id).length; // once committed it has left the hand
    const n = hand >= 7 ? 2 : hand >= 4 ? 1 : 0;
    return { willpower: n, intellect: n };
  },
} satisfies CardScript;
