// Chœur Gothique (Black Stars Rise, version II) — [action] place 1 doom on the current "c" agenda: heal 2 horror (group
// limit once per game).
import { type CardScript } from "../../../../src/engine/api";
import { choeur } from "../../../campaigns/the-path-to-carcosa/scripts/black-stars-rise";

export default choeur("c") satisfies CardScript;
