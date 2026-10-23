// Mutated Experiment — defeated: each investigator at its location takes 1 horror
import { invsAt, push, type CardScript, type EffCtx, type G } from "../../../../src/engine/api";

export default {
  fns: {
    spill(g: G, ctx: EffCtx) {
      const loc = g.s.cards[ctx.source!]?.location ?? null;
      for (const i of invsAt(g, loc))
        push(g, {
          t: "AssignDamage",
          inv: i,
          damage: 0,
          horror: 1,
          direct: false,
          source: ctx.source!,
        });
    },
  },
} satisfies CardScript;
