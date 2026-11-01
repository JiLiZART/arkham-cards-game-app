// Mask of Silenus — reveal 1 additional token and resolve the one chosen; 1 horror if it has a symbol
import {
  addExtraReveal,
  type CardScript,
  currentTest,
  type EffCtx,
  type G,
  push,
  setOnChoose,
} from "../../../../src/engine/api";

const SYMBOLS = ["skull", "cultist", "tablet", "elderThing", "elderSign", "autoFail"];

export default {
  fns: {
    mask(g: G) {
      if (!currentTest(g)) return;
      addExtraReveal(g);
      setOnChoose(g, "12068", "symbol");
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
