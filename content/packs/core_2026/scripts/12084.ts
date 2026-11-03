// On the Brink — the test failed: each other committed card returns to its owner's hand, and you draw 1 card
import {
  cardIf,
  type CardScript,
  currentTest,
  emit,
  type GameContext,
  moveCard,
  EVENT,
  ZONE,
  type ScriptRun,
  queue,
  drawCards,
} from "../../../../src/engine/api";

export default {
  fns: {
    brink(game: GameContext, run: ScriptRun) {
      const t = currentTest(game);
      if (!t) return;
      for (const id of t.committed) {
        const c = cardIf(game, id);
        if (id === run.ctx.source || c?.zone !== "commit" || !c.owner) continue;
        moveCard(game, id, ZONE.Hand, { inv: c.owner });
        emit(game, EVENT.Returned, `${game.db.cards[c.code].name} returns to its owner's hand`, {
          inv: c.owner,
          card: id,
        });
      }
      queue(game, drawCards({ inv: run.you, n: 1 }));
    },
  },
} satisfies CardScript;
