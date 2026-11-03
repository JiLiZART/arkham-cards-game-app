// Southside — the investigators here draw 3 cards between them, one at a time
import {
  inv,
  invsAt,
  type CardScript,
  type GameContext,
  type ScriptRun,
  asNumber,
  queue,
  drawCards,
  runScript,
} from "../../../../src/engine/api";

export default {
  fns: {
    share(game: GameContext, run: ScriptRun) {
      const n = asNumber(run.args) ?? 3;
      if (n <= 0) return;
      const here = invsAt(game, inv(game, run.you).location);
      const who = run.chooseInvestigator(here, {
        text: `Southside: who draws the next card? (${n} left)`,
        key: "chooseInvestigator",
      });
      queue(
        game,
        drawCards({ inv: who, n: 1 }),
        runScript({ code: "12153", fn: "share", ctx: run.ctx, args: n - 1 }),
      );
    },
  },
} satisfies CardScript;
