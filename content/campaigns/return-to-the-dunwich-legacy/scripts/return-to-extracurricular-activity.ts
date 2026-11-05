// Return to Extracurricular Activity (setup card 51012): the base scenario's script, with the box's rules over it
import { type CardScript, composeScript } from "../../../../src/engine/api";
import base from "../../the-dunwich-legacy/scripts/extracurricular-activity";

/** what the box adds to the base scenario */
const returnTo: CardScript = {};

export default composeScript(base, returnTo);
