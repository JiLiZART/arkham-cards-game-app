// A Ritual — each enemy at a location with Fire! attached cannot be damaged
import { type CardScript } from "../../../../src/engine/api";
import { fireShield } from "./12169";

export default { modifiers: fireShield } satisfies CardScript;
