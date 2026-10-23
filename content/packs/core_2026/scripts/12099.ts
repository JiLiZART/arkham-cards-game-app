// The Nameless Lurker — when the investigation phase ends, if it is ready with no doom: 1 doom on it
import { push, type CardScript, type EffCtx, type G } from "../../../../src/engine/api";

export default {
  fns: {
    lurk(g: G, ctx: EffCtx) {
      const e = g.s.cards[ctx.source!];
      if (g.s.phase === "investigation" && e?.zone === "enemy" && !e.exhausted && e.doom === 0)
        push(g, { t: "PlaceDoom", card: e.id, n: 1 });
    },
  },
} satisfies CardScript;
