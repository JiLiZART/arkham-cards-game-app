// Engine Car — unrevealed: it can't be entered while the location to its left has clues (its revealed ability is data)
import { type CardScript } from "../../../../src/engine/api";
import { lockedBehind } from "../../../campaigns/the-dunwich-legacy/scripts/essex-county-express";

export default { modifiers: lockedBehind } satisfies CardScript;
