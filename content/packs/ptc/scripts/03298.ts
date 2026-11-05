// Abbey Tower (Black Stars Rise, The Path is Open) — clues are discovered here only with no cards in hand; [action]:
// discard up to 3 cards from your hand. Unrevealed: it can't be entered without "found the tower key".
import { type CardScript } from "../../../../src/engine/api";
import { tower } from "../../../campaigns/the-path-to-carcosa/scripts/black-stars-rise";

export default tower(true) satisfies CardScript;
