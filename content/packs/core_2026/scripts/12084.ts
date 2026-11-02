// On the Brink — the test failed: each other committed card returns to its owner's hand, and you draw 1 card
import {
  cardIf,
  type CardScript,
  currentTest,
  type EffCtx,
  emit,
  type GameContext,
  moveCard,
  push,
  EVENT,
  ZONE,
  STEP,
} from "../../../../src/engine/api";

export default {
  fns: {
    brink(game: GameContext, ctx: EffCtx) {
      const t = currentTest(game);
      if (!t) return;
      for (const id of t.committed) {
        const c = cardIf(game, id);
        if (id === ctx.source || c?.zone !== "commit" || !c.owner) continue;
        moveCard(game, id, ZONE.Hand, { inv: c.owner });
        emit(game, EVENT.Returned, `${game.db.cards[c.code].name} returns to its owner's hand`, {
          inv: c.owner,
          card: id,
        });
      }
      push(game, { t: STEP.Draw, inv: ctx.you!, n: 1 });
    },
  },
} satisfies CardScript;
