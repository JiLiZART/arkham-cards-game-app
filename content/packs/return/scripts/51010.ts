// Rise to the Occasion (level 3) — committed only to your own test whose difficulty is higher than your base skill
// (cards.json); +1 [wild] for each point of the difference, at most +3
import {
  baseSkill,
  card,
  type CardScript,
  currentTest,
  type GameContext,
  type InstId,
  testDifficulty,
} from "../../../../src/engine/api";

export default {
  icons(game: GameContext, cardId: InstId) {
    const t = currentTest(game);
    const owner = card(game, cardId).owner;
    if (!t || !owner) return {};
    const over = testDifficulty(game, t) - (t.baseSkill ?? baseSkill(game, owner, t.skill));
    return { wild: Math.max(0, Math.min(3, over)) };
  },
} satisfies CardScript;
