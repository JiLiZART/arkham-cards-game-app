// The Yellow Sign — fail: take 2 horror and draw a Madness weakness from your deck
import {
  type CardScript,
  def,
  type EffCtx,
  type G,
  inv,
  moveCard,
  push,
  shuffleDeck,
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
      shuffleDeck(g, me.id);
      if (!found) return;
      moveCard(g, found, "deck", { top: true });
      push(g, { t: "Draw", inv: ctx.you!, n: 1 });
    },
  },
} satisfies CardScript;
