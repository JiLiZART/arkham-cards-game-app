// Theatre Lounge (Return to Curtain Call, a Lobby Doorway) — after you reveal it: the encounter discard pile is
// shuffled into the encounter deck, the 2 topmost hidden cards of the deck go secretly into your hand, the deck is
// shuffled.
import {
  type CardScript,
  def,
  emit,
  EVENT,
  type GameContext,
  hideInHand,
  pile,
  reshuffleDiscard,
  type ScriptRun,
  shuffleDeck,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "forced", trigger: "revealed", run: "lounge" }],
  fns: {
    lounge(game: GameContext, run: ScriptRun) {
      const you = run.ctx.inv ?? run.you;
      reshuffleDiscard(game, "encounter");
      const hidden = pile(game, "encounterDeck")
        .filter((id) => def(game, id).keywords.includes("hidden"))
        .slice(0, 2);
      for (const id of hidden) hideInHand(game, id, you);
      shuffleDeck(game, "encounter");
      emit(game, EVENT.Reshuffle, "The encounter deck is shuffled");
    },
  },
} satisfies CardScript;
