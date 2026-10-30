// Steadfast — gains [willpower][combat] at 5+ total remaining health and sanity, twice that at 10+
import {
  card,
  remainingHealth,
  remainingSanity,
  type CardScript,
  type G,
} from "../../../../src/engine/api";

export default {
  icons(g: G, id: string) {
    const i = card(g, id).owner;
    if (!i) return {};
    const left = remainingHealth(g, i) + remainingSanity(g, i);
    const n = left >= 10 ? 2 : left >= 5 ? 1 : 0;
    return { willpower: n, combat: n };
  },
} satisfies CardScript;
