// Ascending Path (Where Doom Awaits) — unrevealed: you cannot move into it; its investigate ability is in cards.json and
// runs the scenario's `wdaPutPath`, given here too
import { type CardScript } from "../../../../src/engine/api";
import { SHARED } from "../../../campaigns/the-dunwich-legacy/scripts/where-doom-awaits";
import { locked } from "./02052";

export default { ...SHARED, modifiers: locked } satisfies CardScript;
