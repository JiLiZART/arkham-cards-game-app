// Return to The Last King (setup card 52021): the base scenario's script, with the box's rules over it — agenda 1 is
// Better Never Than Late, the asset Dianne Devine replaces the enemy (both the scenario file's), eight Sickening
// Reality cards lie beneath the reference card, Shocking Display waits set aside. As it ends, the enemy Dianne Devine
// in the victory display is a VIP slain.
import {
  allCards,
  type CardScript,
  composeScript,
  flags,
  type GameContext,
  ZONE,
} from "../../../../src/engine/api";
import base from "../../the-path-to-carcosa/scripts/the-last-king";

const DIANNE_ENEMY = "52023";

/** what the box adds to the base scenario */
const returnTo: CardScript = {
  hooks: {
    ended(game: GameContext) {
      if (allCards(game).some((c) => c.code === DIANNE_ENEMY && c.zone === ZONE.Victory))
        flags.logEntry.set(game, ["vipsSlain", DIANNE_ENEMY], true);
    },
  },
};

export default composeScript(base, returnTo);
