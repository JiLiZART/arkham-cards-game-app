// Grand Guignol (A Phantom of Truth) — Forced: after you reveal it, take 2 horror, or shuffle the non-weakness cards of
// your hand into your deck and draw as many.
import {
  type CardScript,
  def,
  emit,
  type GameContext,
  inv,
  moveCard,
  type ScriptRun,
  shuffleDeck,
  EVENT,
  ZONE,
  queue,
  dealDamage,
  drawCards,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "forced", trigger: "revealed", run: "puppets" }],
  fns: {
    puppets(game: GameContext, run: ScriptRun) {
      const hand = inv(game, run.you).hand.filter((id) => !def(game, id).subtype);
      const pick = run.choose<string>(
        [
          {
            id: "horror",
            label: "Take 2 horror",
            value: "horror",
            key: "option.takeHorrorN",
            vars: { n: 2 },
          },
          {
            id: "shuffle",
            label: "Shuffle the non-weakness cards of your hand into your deck and draw as many",
            value: "shuffle",
            key: "option.apotShuffleHand",
          },
        ],
        { text: "Grand Guignol: choose one", key: "grandGuignol" },
        { auto: false },
      );
      if (pick === "horror") {
        queue(
          game,
          dealDamage({ inv: run.you, damage: 0, horror: 2, direct: false, source: run.source }),
        );
        return;
      }
      for (const id of hand) moveCard(game, id, ZONE.Deck, { inv: run.you });
      shuffleDeck(game, run.you);
      emit(game, EVENT.Shuffle, `${hand.length} cards are shuffled into the deck`, {
        inv: run.you,
      });
      if (hand.length) queue(game, drawCards({ inv: run.you, n: hand.length }));
    },
  },
} satisfies CardScript;
