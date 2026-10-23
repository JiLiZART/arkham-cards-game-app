// Mask of Silenus — reveal 1 additional token and resolve the one chosen; 1 horror if it has a symbol
import { push, type CardScript, type EffCtx, type G } from "../../../../src/engine/api";

const SYMBOLS = ["skull", "cultist", "tablet", "elderThing", "elderSign", "autoFail"];

export default {
  fns: {
    mask(g: G) {
      const t = g.s.skillTest;
      if (!t) return;
      t.extraReveal = (t.extraReveal ?? 0) + 1;
      t.onChoose = { code: "12068", fn: "symbol" };
    },
    symbol(g: G, ctx: EffCtx) {
      if (ctx.token && SYMBOLS.includes(ctx.token))
        push(g, {
          t: "AssignDamage",
          inv: ctx.you!,
          damage: 0,
          horror: 1,
          direct: false,
          source: null,
        });
    },
  },
} satisfies CardScript;
