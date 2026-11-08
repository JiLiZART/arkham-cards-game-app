// Palace of the King (Hastur's Domain) (Return to Dim Carcosa): it cannot be flipped over while Hastur has more than 2
// [per_investigator] remaining health (read by the scenario's canFlip, act 3's ability). Its story is Hastur's Last
// Stand (52060b).
import {
  type CardScript,
  enemyStat,
  type GameContext,
  playerCount,
} from "../../../../src/engine/api";
import { hastur } from "../../../campaigns/the-path-to-carcosa/scripts/dim-carcosa";

export const HASTURS_DOMAIN = "52060";

export const domainSealed = (game: GameContext) => {
  const h = hastur(game);
  return !!h && enemyStat(game, h.id, "health") - h.damage > 2 * playerCount(game);
};

export default {} satisfies CardScript;
