// The Yellow Sign — fail: take 2 horror and draw a Madness weakness from your deck
import {
  def,
  inv,
  moveCard,
  push,
  shuffle,
  type CardScript,
  type EffCtx,
  type G,
} from "../../../../src/engine/api";

export default {
  abilities: [
    {
      kind: "revelation",
      effects: [
        {
          op: "skillTest",
          skill: "willpower",
          difficulty: 4,
          onFail: [
            { op: "takeHorror", amount: 2 },
            { op: "script", fn: "madness" },
          ],
        },
      ],
    },
  ],
  fns: {
    madness(g: G, ctx: EffCtx) {
      const me = inv(g, ctx.you!);
      const found = me.deck.find(
        (id) => def(g, id).subtype && def(g, id).traits.includes("Madness"),
      );
      shuffle(g.s, me.deck);
      if (!found) return;
      moveCard(g, found, "deck", { top: true });
      push(g, { t: "Draw", inv: ctx.you!, n: 1 });
    },
  },
} satisfies CardScript;
