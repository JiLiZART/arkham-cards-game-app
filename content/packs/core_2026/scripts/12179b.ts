// Elokoss (Mother of Flame) — after you evade her: she readies and cannot attack you this round
import {
  cardIf,
  type CardScript,
  currentRound,
  type EffCtx,
  flags,
  type G,
} from "../../../../src/engine/api";

export default {
  fns: {
    unbowed(g: G, ctx: EffCtx) {
      const e = cardIf(g, ctx.source!);
      if (e?.zone !== "enemy" || ctx.enemy !== e.id || !ctx.inv) return;
      e.exhausted = false;
      flags.noAttack.set(g, [e.id, ctx.inv], currentRound(g));
    },
  },
} satisfies CardScript;
