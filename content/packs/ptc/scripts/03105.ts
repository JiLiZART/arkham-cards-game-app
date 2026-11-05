// The Pale Mask Beckons — The Man in the Pallid Mask in play attacks each investigator in player order, wherever he is;
// else his bearer draws him from their deck or discard pile, and their deck is shuffled.
import {
  activeInvs,
  allCards,
  attackKey,
  type CardScript,
  enemies,
  type GameContext,
  inv,
  putOnTop,
  shuffleDeck,
  turnOrder,
  ZONE,
  type ScriptRun,
  queue,
  drawCards,
  enemyAttacks,
  runScript,
} from "../../../../src/engine/api";
import { MITPM } from "./03059";

export default {
  abilities: [{ kind: "revelation", run: "beckon" }],
  fns: {
    beckon(game: GameContext, run: ScriptRun) {
      const him = enemies(game).find((e) => e.code === MITPM);
      if (him) {
        queue(
          game,
          ...turnOrder(game)
            .filter((i) => activeInvs(game).includes(i))
            .map((i) => enemyAttacks({ enemy: him.id, inv: i, aoo: false, key: attackKey(game) })),
        );
        return;
      }
      // his bearer: the owner of the copy in a deck or discard pile (an eliminated bearer can't draw him)
      const copy = allCards(game).find(
        (c) => c.code === MITPM && c.owner && (c.zone === ZONE.Deck || c.zone === ZONE.Discard),
      );
      const bearer = copy?.owner;
      if (!copy || !bearer || inv(game, bearer).status !== "playing") return;
      putOnTop(game, bearer, [copy.id]);
      queue(
        game,
        drawCards({ inv: bearer, n: 1 }),
        runScript({ code: "03105", fn: "shuffle", ctx: { ...run.ctx, you: bearer } }),
      );
    },
    shuffle(game: GameContext, run: ScriptRun) {
      shuffleDeck(game, run.you);
    },
  },
} satisfies CardScript;
