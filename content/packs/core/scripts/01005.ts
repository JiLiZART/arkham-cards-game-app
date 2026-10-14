// Wendy Adams — elder sign: +0; if Wendy's Amulet is in play, automatically succeed
import { controlled, type CardScript, type G } from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "elderSign", tokenValue: 0, run: "elderSign" }],
  fns: {
    elderSign(g: G) {
      const t = g.s.skillTest!;
      if (controlled(g, t.inv).some((c) => c.code === "01014")) t.autoSucceed = true;
    },
  },
} satisfies CardScript;
