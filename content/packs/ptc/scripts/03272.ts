// "Not without a fight!" — committed only while you are engaged (cards.json commitIf); for each enemy engaged with you it
// gains [willpower] [combat] [agility]
import {
  card,
  type CardScript,
  enemies,
  type GameContext,
  type InstId,
} from "../../../../src/engine/api";

export default {
  icons(game: GameContext, cardId: InstId) {
    const c = card(game, cardId);
    const who = c.controller ?? c.owner;
    const n = enemies(game).filter((e) => e.engagedWith === who).length;
    return { willpower: n, combat: n, agility: n };
  },
} satisfies CardScript;
