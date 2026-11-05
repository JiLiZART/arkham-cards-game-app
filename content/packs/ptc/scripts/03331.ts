// Palace of the King (Dim Carcosa): it cannot be flipped over unless Hastur has at least 5 damage per investigator on
// him (read by the scenario's canFlip, act 3's ability). Its story is Hastur's End (03331b).
import { type CardScript, type GameContext, playerCount } from "../../../../src/engine/api";
import { hasturDamage } from "../../../campaigns/the-path-to-carcosa/scripts/dim-carcosa";

export const palaceSealed = (game: GameContext) => hasturDamage(game) < 5 * playerCount(game);

export default {} satisfies CardScript;
