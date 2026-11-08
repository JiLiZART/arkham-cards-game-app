// Return to A Phantom of Truth (setup card 52040): the base scenario's script, with the box's rules over it — each of
// six locations is the base or the box's version at random, the other removed, and both Figure in the Shadows wait set
// aside (the scenario file's setup); "after The Organist enters play: shuffle both set-aside copies of Figure in the
// Shadows into the encounter deck, along with the encounter discard pile". He enters play only from act 1's back, so
// that is when the next act begins.
import {
  allCards,
  type CardScript,
  composeScript,
  emit,
  EVENT,
  flags,
  type GameContext,
  moveCard,
  reshuffleDiscard,
  ZONE,
} from "../../../../src/engine/api";
import base, { organist } from "../../the-path-to-carcosa/scripts/a-phantom-of-truth";

const FIGURE = "52047";
const SHUFFLED = "rapotFiguresShuffled";

/** what the box adds to the base scenario */
const returnTo: CardScript = {
  hooks: {
    actAdvanced(game: GameContext) {
      if (flags.named(game, SHUFFLED) || !organist(game)) return;
      flags.setNamed(game, SHUFFLED, true);
      for (const c of allCards(game).filter((x) => x.code === FIGURE && x.zone === ZONE.SetAside))
        moveCard(game, c.id, ZONE.EncounterDeck);
      reshuffleDiscard(game, "encounter");
      emit(
        game,
        EVENT.Shuffle,
        "Both Figure in the Shadows and the encounter discard pile are shuffled into the encounter deck",
      );
    },
  },
};

export default composeScript(base, returnTo);
