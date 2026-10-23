// Southside — the investigators here draw 3 cards between them, one at a time
import {
  ask,
  inv,
  invName,
  invsAt,
  push,
  type CardScript,
  type EffCtx,
  type G,
  type InvId,
  type Step,
} from "../../../../src/engine/api";

export default {
  fns: {
    share(g: G, ctx: EffCtx, left: number | undefined, step?: Step) {
      const n = left ?? 3;
      if (n <= 0) return;
      const here = invsAt(g, inv(g, ctx.you!).location);
      const who = ask<InvId>(
        g,
        step!,
        ctx.you!,
        "target",
        `Southside: who draws the next card? (${n} left)`,
        here.map((i) => ({ id: i, label: invName(g, i), card: inv(g, i).cardId, value: i })),
        { auto: true, key: "chooseInvestigator" },
      );
      if (who === undefined) return;
      push(
        g,
        { t: "Draw", inv: who, n: 1 },
        { t: "Script", code: "12153", fn: "share", ctx, args: n - 1 },
      );
    },
  },
} satisfies CardScript;
