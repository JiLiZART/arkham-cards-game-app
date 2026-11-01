// Mutated Experiment — defeated: each investigator at its location takes 1 horror
import {
  cardIf,
  type CardScript,
  type EffCtx,
  type G,
  invsAt,
  push,
} from "../../../../src/engine/api";

export default {
  fns: {
    spill(g: G, ctx: EffCtx) {
      const loc = cardIf(g, ctx.source!)?.location ?? null;
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
