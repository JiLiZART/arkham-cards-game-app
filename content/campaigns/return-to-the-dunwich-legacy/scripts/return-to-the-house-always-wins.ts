// Return to The House Always Wins (setup card 51015): the base scenario's script, with the box's rules over it
import { type CardScript, composeScript } from "../../../../src/engine/api";
import base from "../../the-dunwich-legacy/scripts/the-house-always-wins";

/** what the box adds to the base scenario */
const returnTo: CardScript = {};

export default composeScript(base, returnTo);
