// Return to Curtain Call (setup card 52014): the base scenario's script, with the box's rules over it — act 2 is one of
// six versions (the scenario file's act deck; 03047a holds them all), Theatre Lounge and Prop Shop join the Doorway pools
// (the Lobby's and Backstage's scripts), the setup card is attached to Royal Emissary (its own script counts the
// warnings), and La Comtesse, once defeated, goes into her defeater's hand.
import {
  attachTo,
  type CardScript,
  composeScript,
  createCard,
  findByCode,
  type GameContext,
  ZONE,
} from "../../../../src/engine/api";
import base from "../../the-path-to-carcosa/scripts/curtain-call";
import { EMISSARY } from "../../../packs/return/scripts/52014";
import { comtesseToHand } from "../../../packs/return/scripts/52020";

/** what the box adds to the base scenario */
const returnTo: CardScript = {
  fns: {
    /** "Attach this card to Royal Emissary" (set aside, out of play, until agenda 1b spawns him) */
    attachToEmissary(game: GameContext) {
      const him = findByCode(game, EMISSARY, [ZONE.SetAside]);
      if (him) attachTo(game, createCard(game, "52014", ZONE.Attached), him.id);
    },
  },
  hooks: {
    checkObjectives(game: GameContext) {
      comtesseToHand(game);
    },
  },
};

export default composeScript(base, returnTo);
