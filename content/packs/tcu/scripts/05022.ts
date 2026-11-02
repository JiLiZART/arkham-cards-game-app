// Steadfast — gains [willpower][combat] at 5+ total remaining health and sanity, twice that at 10+
import {
  card,
  remainingHealth,
  remainingSanity,
  type CardScript,
  type GameContext,
} from "../../../../src/engine/api";

export default {
  icons(game: GameContext, id: string) {
    const i = card(game, id).owner;
    if (!i) return {};
    const left = remainingHealth(game, i) + remainingSanity(game, i);
    const n = left >= 10 ? 2 : left >= 5 ? 1 : 0;
    return { willpower: n, combat: n };
  },
} satisfies CardScript;
