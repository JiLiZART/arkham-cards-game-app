// Southside — the investigators here draw 3 cards between them, one at a time
import {
  ask,
  inv,
  invName,
  invsAt,
  push,
  type CardScript,
  type EffCtx,
  type GameContext,
  type InvId,
  type Step,
  CHOICE,
  STEP,
} from "../../../../src/engine/api";

export default {
  fns: {
    share(game: GameContext, ctx: EffCtx, left: number | undefined, step?: Step) {
      const n = left ?? 3;
      if (n <= 0) return;
      const here = invsAt(game, inv(game, ctx.you!).location);
      const who = ask<InvId>(
        game,
        step!,
        ctx.you!,
        CHOICE.Target,
        `Southside: who draws the next card? (${n} left)`,
        here.map((i) => ({ id: i, label: invName(game, i), card: inv(game, i).cardId, value: i })),
        { auto: true, key: "chooseInvestigator" },
      );
      if (who === undefined) return;
      push(
        game,
        { t: STEP.Draw, inv: who, n: 1 },
        { t: STEP.Script, code: "12153", fn: "share", ctx, args: n - 1 },
      );
    },
  },
} satisfies CardScript;
