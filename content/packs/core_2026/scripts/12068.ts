// Mask of Silenus — reveal 1 additional token and resolve the one chosen; 1 horror if it has a symbol
import {
  addExtraReveal,
  type CardScript,
  currentTest,
  type GameContext,
  setOnChoose,
  type ScriptRun,
  queue,
  dealDamage,
} from "../../../../src/engine/api";

const SYMBOLS = ["skull", "cultist", "tablet", "elderThing", "elderSign", "autoFail"];

export default {
  fns: {
    mask(game: GameContext) {
      if (!currentTest(game)) return;
      addExtraReveal(game);
      setOnChoose(game, "12068", "symbol");
    },
    symbol(game: GameContext, run: ScriptRun) {
      if (run.ctx.token && SYMBOLS.includes(run.ctx.token))
        queue(
          game,
          dealDamage({ inv: run.you, damage: 0, horror: 1, direct: false, source: null }),
        );
    },
  },
} satisfies CardScript;
