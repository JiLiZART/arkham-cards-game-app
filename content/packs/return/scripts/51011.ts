// Through the Gates — Revelation: draw the top card of your deck; a weakness is drawn as any is, any other card leaves
// the game with each other copy (by title) you own in your deck, discard pile, hand and play areas
import {
  allCards,
  type CardScript,
  def,
  drawCards,
  type GameContext,
  inv,
  moveCard,
  queue,
  type ScriptRun,
  ZONE,
} from "../../../../src/engine/api";

const OWN_ZONES: string[] = [ZONE.Deck, ZONE.Discard, ZONE.Hand, ZONE.Play, ZONE.Threat];

export default {
  abilities: [{ kind: "revelation", run: "gates" }],
  fns: {
    gates(game: GameContext, run: ScriptRun) {
      const top = inv(game, run.you).deck[0];
      if (!top) return;
      if (def(game, top).subtype) {
        queue(game, drawCards({ inv: run.you, n: 1 }));
        return;
      }
      const name = def(game, top).name;
      for (const c of allCards(game))
        if (c.owner === run.you && OWN_ZONES.includes(c.zone) && def(game, c.id).name === name)
          moveCard(game, c.id, ZONE.Removed);
    },
  },
} satisfies CardScript;
