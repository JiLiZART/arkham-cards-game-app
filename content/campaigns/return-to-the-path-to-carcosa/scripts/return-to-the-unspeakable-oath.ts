// Return to The Unspeakable Oath (setup card 52034): the base scenario's script, with the box's rules over it
import { type CardScript, composeScript } from "../../../../src/engine/api";
import base from "../../the-path-to-carcosa/scripts/the-unspeakable-oath";

/** what the box adds to the base scenario */
const returnTo: CardScript = {};

export default composeScript(base, returnTo);
