// On the Brink — the test failed: each other committed card returns to its owner's hand, and you draw 1 card
import {
  emit,
  moveCard,
  push,
  type CardScript,
  type EffCtx,
  type G,
} from "../../../../src/engine/api";

export default {
  fns: {
    brink(g: G, ctx: EffCtx) {
      const t = g.s.skillTest;
      if (!t) return;
      for (const id of t.committed) {
        const c = g.s.cards[id];
        if (id === ctx.source || c?.zone !== "commit" || !c.owner) continue;
        moveCard(g, id, "hand", { inv: c.owner });
        emit(g, "returned", `${g.db.cards[c.code].name} returns to its owner's hand`, {
          inv: c.owner,
          card: id,
        });
      }
      push(g, { t: "Draw", inv: ctx.you!, n: 1 });
    },
  },
} satisfies CardScript;
