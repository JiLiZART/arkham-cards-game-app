// Daisy Walker — elder sign: +0, if you succeed draw 1 card for each Tome you control
import { type CardScript, controlled, currentTest, def, type G } from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "elderSign", tokenValue: 0, run: "elderSign" }],
  fns: {
    elderSign(g: G) {
      const t = currentTest(g)!;
      const tomes = controlled(g, t.inv).filter((c) => def(g, c.id).traits.includes("Tome")).length;
      if (tomes) t.tokenOnSuccess.push({ op: "drawCards", amount: tomes });
    },
  },
} satisfies CardScript;
