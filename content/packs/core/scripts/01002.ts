// Daisy Walker — elder sign: +0, if you succeed draw 1 card for each Tome you control
import {
  type CardScript,
  controlled,
  currentTest,
  def,
  type GameContext,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "elderSign", tokenValue: 0, run: "elderSign" }],
  fns: {
    elderSign(game: GameContext) {
      const t = currentTest(game)!;
      const tomes = controlled(game, t.inv).filter((c) =>
        def(game, c.id).traits.includes("Tome"),
      ).length;
      if (tomes) t.tokenOnSuccess.push({ op: "drawCards", amount: tomes });
    },
  },
} satisfies CardScript;
