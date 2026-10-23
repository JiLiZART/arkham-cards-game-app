// Eager for Death — test willpower (2), +1 difficulty per damage on you; fail: 2 horror
import { inv, push, type CardScript, type EffCtx, type G } from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "eager" }],
  fns: {
    eager(g: G, ctx: EffCtx) {
      push(g, {
        t: "Eff",
        effect: {
          op: "skillTest",
          skill: "willpower",
          difficulty: 2 + inv(g, ctx.you!).damage,
          onFail: [{ op: "takeHorror", amount: 2 }],
        },
        ctx,
      });
    },
  },
} satisfies CardScript;
