// Haunting Recollections — Revelation: 1 horror for each card in your hand with a copy (by title) in your discard pile,
// at most 3; taking none, you discard the top 3 cards of your deck instead
import {
  type CardScript,
  def,
  type GameContext,
  inv,
  queue,
  resolveEffect,
  type ScriptRun,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "recollections" }],
  fns: {
    recollections(game: GameContext, run: ScriptRun) {
      const me = inv(game, run.you);
      const discarded = new Set(me.discard.map((id) => def(game, id).name));
      const n = Math.min(3, me.hand.filter((id) => discarded.has(def(game, id).name)).length);
      queue(
        game,
        resolveEffect({
          effect: n ? { op: "takeHorror", amount: n } : { op: "discardDeckTop", amount: 3 },
          ctx: run.ctx,
        }),
      );
    },
  },
} satisfies CardScript;
