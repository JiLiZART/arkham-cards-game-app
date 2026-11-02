// Scrape By — succeed by 0 instead; 1 horror if a token with a symbol was revealed
import {
  addTempMod,
  type CardScript,
  currentTest,
  type EffCtx,
  type GameContext,
  push,
  STEP,
} from "../../../../src/engine/api";

const SYMBOLS = ["skull", "cultist", "tablet", "elderThing", "elderSign"];

export default {
  fns: {
    scrape(game: GameContext, ctx: EffCtx) {
      const t = currentTest(game);
      if (!t) return;
      addTempMod(
        game,
        { stat: "testValue", value: ctx.failBy ?? 0 },
        t.inv,
        "test",
        ctx.source ?? null,
      );
      if (t.tokens.some((x) => SYMBOLS.includes(x)))
        push(game, {
          t: STEP.AssignDamage,
          inv: ctx.you!,
          damage: 0,
          horror: 1,
          direct: false,
          source: ctx.source ?? null,
        });
    },
  },
} satisfies CardScript;
