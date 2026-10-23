// Dead Ends — found by a search of its deck, it is drawn and cancels the search (effects.ts); 2 fewer experience if it is in the hand when the game ends
import { card, type CardScript, type EffCtx, type G } from "../../../../src/engine/api";

export default {
  hooks: {
    searched() {},
    gameEnd(g: G, ctx: EffCtx) {
      const c = card(g, ctx.source!);
      if (c.zone !== "hand" || !c.owner) return;
      const key = `xp:${c.owner}`;
      g.s.flags[key] = ((g.s.flags[key] as number | undefined) ?? 0) - 2;
    },
  },
} satisfies CardScript;
