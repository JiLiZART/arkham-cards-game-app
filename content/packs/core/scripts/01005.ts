// Wendy Adams — elder sign: +0; if Wendy's Amulet is in play, automatically succeed
import {
  type CardScript,
  controlled,
  currentTest,
  forceResult,
  type G,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "elderSign", tokenValue: 0, run: "elderSign" }],
  fns: {
    elderSign(g: G) {
      const t = currentTest(g)!;
      if (controlled(g, t.inv).some((c) => c.code === "01014")) forceResult(g, "succeed");
    },
  },
} satisfies CardScript;
