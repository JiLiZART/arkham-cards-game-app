// Goat Spawn — when defeated, each investigator at its location takes 1 horror
import {
  card,
  invsAt,
  push,
  type CardScript,
  type EffCtx,
  type G,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "forced", trigger: "enemyDefeatedSelf", run: "bleat" }],
  fns: {
    bleat(g: G, ctx: EffCtx) {
      for (const i of invsAt(g, card(g, ctx.source!).location)) {
        push(g, {
          t: "AssignDamage",
          inv: i,
          damage: 0,
          horror: 1,
          direct: false,
          source: ctx.source ?? null,
        });
      }
    },
  },
} satisfies CardScript;
