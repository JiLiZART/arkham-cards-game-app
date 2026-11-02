// The Yellow Sign — fail: take 2 horror and draw a Madness weakness from your deck
import {
  type CardScript,
  def,
  type EffCtx,
  type GameContext,
  inv,
  moveCard,
  push,
  shuffleDeck,
  ZONE,
  STEP,
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
    madness(game: GameContext, ctx: EffCtx) {
      const me = inv(game, ctx.you!);
      const found = me.deck.find(
        (id) => def(game, id).subtype && def(game, id).traits.includes("Madness"),
      );
      shuffleDeck(game, me.id);
      if (!found) return;
      moveCard(game, found, ZONE.Deck, { top: true });
      push(game, { t: STEP.Draw, inv: ctx.you!, n: 1 });
    },
  },
} satisfies CardScript;
