// Scrape By — succeed by 0 instead; 1 horror if a token with a symbol was revealed
import {
  addTempMod,
  type CardScript,
  currentTest,
  type GameContext,
  type ScriptRun,
  queue,
  dealDamage,
} from "../../../../src/engine/api";

const SYMBOLS = ["skull", "cultist", "tablet", "elderThing", "elderSign"];

export default {
  fns: {
    scrape(game: GameContext, run: ScriptRun) {
      const t = currentTest(game);
      if (!t) return;
      addTempMod(
        game,
        { stat: "testValue", value: run.ctx.failBy ?? 0 },
        t.inv,
        "test",
        run.ctx.source ?? null,
      );
      if (t.tokens.some((x) => SYMBOLS.includes(x)))
        queue(
          game,
          dealDamage({
            inv: run.you,
            damage: 0,
            horror: 1,
            direct: false,
            source: run.ctx.source ?? null,
          }),
        );
    },
  },
} satisfies CardScript;
