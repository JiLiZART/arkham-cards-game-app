// Ascending Path (Warped and Twisted, Return to Where Doom Awaits) — unrevealed: you cannot move into it; connected to
// each Altered Path (the scenario's `connections`); forced after you discover clues from it: spend those clues and put
// that many random set-aside Altered Paths into play
import { type CardScript } from "../../../../src/engine/api";
import { locked } from "../../dwl/scripts/02052";
import { WARPED } from "./51048";

export default { ...WARPED, modifiers: locked } satisfies CardScript;
