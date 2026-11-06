// On the Hunt — instead of your mythos encounter draw: an enemy from the top 9 cards of the encounter deck spawns engaged
// with you and the deck is shuffled; with none there, the deck is shuffled and the draw goes ahead
import {
  cancelEvent,
  type CardScript,
  def,
  emit,
  EVENT,
  type GameContext,
  inv,
  invName,
  moveCard,
  pile,
  queue,
  type ScriptRun,
  shuffleDeck,
  spawn,
  ZONE,
} from "../../../../src/engine/api";

export default {
  abilities: [
    {
      kind: "reaction",
      fromHand: true,
      trigger: "wouldDrawEncounter",
      condition: { eventInvestigatorIsYou: true },
      run: "hunt",
    },
  ],
  fns: {
    hunt(game: GameContext, run: ScriptRun) {
      const top = pile(game, ZONE.EncounterDeck).slice(0, 9);
      const found = top.filter((id) => def(game, id).type === "enemy");
      if (!found.length || !run.ctx.key) {
        shuffleDeck(game, "encounter");
        return;
      }
      const pick = run.chooseCard(
        found,
        { text: "On the Hunt: choose an enemy to spawn engaged with you", key: "onTheHunt" },
        { shown: top },
      );
      cancelEvent(game, run.ctx.key);
      moveCard(game, pick, ZONE.Limbo);
      shuffleDeck(game, "encounter");
      emit(game, EVENT.Search, `${invName(game, run.you)} hunts down ${def(game, pick).name}`, {
        inv: run.you,
        card: pick,
      });
      const at = inv(game, run.you).location;
      queue(game, spawn({ enemy: pick, inv: run.you, at, engage: run.you }));
    },
  },
} satisfies CardScript;
