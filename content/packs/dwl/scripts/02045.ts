// After Hours (Extracurricular Activity, act 1) — back: the encounter discard pile and the set-aside "Jazz" Mulligan
// shuffled into the encounter deck
import {
  type CardScript,
  emit,
  findByCode,
  type GameContext,
  moveCard,
  reshuffleDiscard,
  EVENT,
  ZONE,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "back" }],
  fns: {
    back(game: GameContext) {
      const jazz = findByCode(game, "02060", [ZONE.SetAside]);
      if (jazz) moveCard(game, jazz.id, ZONE.EncounterDeck);
      reshuffleDiscard(game, "encounter");
      emit(
        game,
        EVENT.Reshuffle,
        'The encounter discard pile and "Jazz" Mulligan are shuffled into the encounter deck',
      );
    },
  },
} satisfies CardScript;
