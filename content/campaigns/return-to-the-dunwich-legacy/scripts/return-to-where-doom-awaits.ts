// Return to Where Doom Awaits (setup card 51047): the base scenario's script, with the box's rules over it — the Warped
// and Twisted Base of the Hill and Ascending Path in place of the originals and a fifth Diverging and Altered Path in
// their pools (the scenario's setup). If Naomi has your back, Naomi O'Bannion goes to a deck instead of the lead's
// clues: the flow's choice before the scenario, so the setup here gives no clues.
import {
  addCounter,
  asNumber,
  campaignLogOf,
  type CardScript,
  composeScript,
  currentAgenda,
  type GameContext,
} from "../../../../src/engine/api";
import base from "../../the-dunwich-legacy/scripts/where-doom-awaits";

/** what the box adds to the base scenario */
const returnTo: CardScript = {
  fns: {
    wdaSetup(game: GameContext) {
      // "Because X brood escaped into the wild, add X doom to agenda 1a"
      const brood = asNumber(campaignLogOf(game).broodEscaped) ?? 0;
      const agenda = currentAgenda(game);
      if (brood > 0 && agenda) addCounter(game, agenda, "doom", brood);
    },
  },
};

export default composeScript(base, returnTo);
