// Hidden Library — "While an enemy is moving, Hidden Library gains the [[Passageway]] trait." Echoes of the Past's
// script answers it: during act 3 its `connections` hook counts the Hidden Library among the Passageways for an
// enemy's move (the engine asks with `enemy`), never for an investigator's.
import type { CardScript } from "../../../../src/engine/api";

export default {} satisfies CardScript;
