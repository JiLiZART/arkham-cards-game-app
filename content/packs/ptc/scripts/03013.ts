// Stars of Hyades — a random event beneath Sefina Rousseau leaves the game, else 1 damage and 1 horror; with 5 or more
// cards in her deck it is shuffled back into the deck instead of discarded
import {
  type CardScript,
  cardsBeneath,
  dealDamage,
  def,
  emit,
  EVENT,
  type GameContext,
  inv,
  moveCard,
  queue,
  randomInt,
  type ScriptRun,
  shuffleIntoDeck,
  ZONE,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "stars" }],
  fns: {
    stars(game: GameContext, run: ScriptRun) {
      const me = inv(game, run.you);
      const events = cardsBeneath(game, me.cardId).filter((id) => def(game, id).type === "event");
      if (events.length) {
        const gone = events[randomInt(game, events.length)];
        moveCard(game, gone, ZONE.Removed);
        emit(game, EVENT.Place, `${def(game, gone).name} is removed from the game`, {
          inv: run.you,
          card: gone,
        });
      } else
        queue(
          game,
          dealDamage({ inv: run.you, damage: 1, horror: 1, direct: false, source: run.source }),
        );
      if (me.deck.length >= 5) shuffleIntoDeck(game, run.source, run.you);
    },
  },
} satisfies CardScript;
