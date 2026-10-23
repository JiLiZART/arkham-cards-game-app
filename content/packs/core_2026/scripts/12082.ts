// Scrape By — succeed by 0 instead; 1 horror if a token with a symbol was revealed
import { addTempMod, push, type CardScript, type EffCtx, type G } from "../../../../src/engine/api";

const SYMBOLS = ["skull", "cultist", "tablet", "elderThing", "elderSign"];

export default {
  fns: {
    scrape(g: G, ctx: EffCtx) {
      const t = g.s.skillTest;
      if (!t) return;
      addTempMod(
        g,
        { stat: "testValue", value: ctx.failBy ?? 0 },
        t.inv,
        "test",
        ctx.source ?? null,
      );
      if (t.tokens.some((x) => SYMBOLS.includes(x)))
        push(g, {
          t: "AssignDamage",
          inv: ctx.you!,
          damage: 0,
          horror: 1,
          direct: false,
          source: ctx.source ?? null,
        });
    },
  },
} satisfies CardScript;
