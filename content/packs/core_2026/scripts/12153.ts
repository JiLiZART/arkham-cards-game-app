// Southside — the investigators here draw 3 cards between them, one at a time
import {
  inv,
  invsAt,
  push,
  type CardScript,
  type GameContext,
  STEP,
  type ScriptRun,
  asNumber,
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
      push(
        game,
        { t: STEP.Draw, inv: who, n: 1 },
        { t: STEP.Script, code: "12153", fn: "share", ctx: run.ctx, args: n - 1 },
      );
    },
  },
} satisfies CardScript;
