// Mask of Silenus — reveal 1 additional token and resolve the one chosen; 1 horror if it has a symbol
import {
  addExtraReveal,
  type CardScript,
  currentTest,
  type EffCtx,
  type GameContext,
  push,
  setOnChoose,
  STEP,
} from "../../../../src/engine/api";

const SYMBOLS = ["skull", "cultist", "tablet", "elderThing", "elderSign", "autoFail"];

export default {
  fns: {
    mask(game: GameContext) {
      if (!currentTest(game)) return;
      addExtraReveal(game);
      setOnChoose(game, "12068", "symbol");
    },
    symbol(game: GameContext, ctx: EffCtx) {
      if (ctx.token && SYMBOLS.includes(ctx.token))
        push(game, {
          t: STEP.AssignDamage,
          inv: ctx.you!,
          damage: 0,
          horror: 1,
          direct: false,
          source: null,
        });
    },
  },
} satisfies CardScript;
