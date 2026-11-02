// Wendy Adams — elder sign: +0; if Wendy's Amulet is in play, automatically succeed
import {
  type CardScript,
  controlled,
  currentTest,
  forceResult,
  type GameContext,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "elderSign", tokenValue: 0, run: "elderSign" }],
  fns: {
    elderSign(game: GameContext) {
      const t = currentTest(game)!;
      if (controlled(game, t.inv).some((c) => c.code === "01014")) forceResult(game, "succeed");
    },
  },
} satisfies CardScript;
