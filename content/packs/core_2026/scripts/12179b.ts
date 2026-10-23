// Elokoss (Mother of Flame) — after you evade her: she readies and cannot attack you this round
import { type CardScript, type EffCtx, type G } from "../../../../src/engine/api";

export default {
  fns: {
    unbowed(g: G, ctx: EffCtx) {
      const e = g.s.cards[ctx.source!];
      if (e?.zone !== "enemy" || ctx.enemy !== e.id || !ctx.inv) return;
      e.exhausted = false;
      g.s.flags[`noAttack:${e.id}:${ctx.inv}`] = g.s.round;
    },
  },
} satisfies CardScript;
