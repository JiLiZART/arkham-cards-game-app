// The Clover Club (The House Always Wins, agenda 1) — each Criminal enemy gains Aloof; damage dealt to a Criminal enemy
// advances it; back: the encounter discard pile shuffled in, and after Extracurricular Activity agenda 2 is skipped to
// its back
import {
  campaignLogOf,
  type CardScript,
  deckCards,
  def,
  emit,
  enemies,
  type GameContext,
  moveCard,
  reshuffleDiscard,
  EVENT,
  ZONE,
  queue,
  advanceAgenda,
  runScript,
} from "../../../../src/engine/api";

/** Extracurricular Activity was played before: every one of its resolutions records what became of Warren Rice */
export const eaCompleted = (game: GameContext) => {
  const log = campaignLogOf(game);
  return !!log.warrenRiceKidnapped || !!log.warrenRiceRescued;
};

export default {
  abilities: [
    {
      kind: "forced",
      trigger: "enemyDamaged",
      condition: { eventEnemy: { trait: "Criminal" } },
      run: "advance",
    },
    { kind: "revelation", run: "back" },
  ],
  modifiers(game: GameContext) {
    return enemies(game)
      .filter((e) => def(game, e.id).traits.includes("Criminal"))
      .map((e) => ({ target: e.id, mod: { keyword: "aloof" as const } }));
  },
  fns: {
    advance(game: GameContext) {
      queue(game, advanceAgenda());
    },
    back(game: GameContext) {
      reshuffleDiscard(game, "encounter");
      emit(game, EVENT.Reshuffle, "The encounter discard pile is shuffled into the encounter deck");
      // "advance directly to agenda 2b": agenda 2 never becomes current, its back resolves now
      const next = eaCompleted(game) ? deckCards(game, "agenda")[0] : undefined;
      if (!next) return;
      moveCard(game, next, ZONE.Removed);
      queue(game, runScript({ code: "02064", fn: "back", ctx: { source: next } }));
    },
  },
} satisfies CardScript;
