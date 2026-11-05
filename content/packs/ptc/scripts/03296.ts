// Chapel of St. Aubert (Black Stars Rise, The Path is Open) — clues are discovered here only with 3 or fewer remaining
// sanity; [action]: take up to 3 horror. Unrevealed: it can't be entered without "found a guide".
import { type CardScript } from "../../../../src/engine/api";
import { chapel } from "../../../campaigns/the-path-to-carcosa/scripts/black-stars-rise";

export default chapel(true) satisfies CardScript;
