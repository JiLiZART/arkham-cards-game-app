// Chœur Gothique (Black Stars Rise, version I) — [action] place 1 doom on the current "a" agenda: heal 2 damage (group
// limit once per game).
import { type CardScript } from "../../../../src/engine/api";
import { choeur } from "../../../campaigns/the-path-to-carcosa/scripts/black-stars-rise";

export default choeur("a") satisfies CardScript;
