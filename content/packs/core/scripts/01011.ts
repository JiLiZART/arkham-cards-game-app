// Hospital Debts — earn 2 fewer experience if fewer than 6 resources on it at game end
import { card, type CardScript, type EffCtx, type G } from "../../../../src/engine/api";

export default {
  hooks: {
    gameEnd(g: G, ctx: EffCtx) {
      const c = card(g, ctx.source!);
      if (c.resources < 6 && c.controller) g.s.flags[`xp:${c.controller}`] = ((g.s.flags[`xp:${c.controller}`] as number) ?? 0) - 2;
    },
  },
} satisfies CardScript;
