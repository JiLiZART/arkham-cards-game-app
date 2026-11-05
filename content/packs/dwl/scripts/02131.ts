// Administration Office (paperwork) — you cannot investigate it while you have 4 or fewer cards in your hand
import { type CardScript, inv } from "../../../../src/engine/api";
import { cannotInvestigateWhile } from "./02130";

export default {
  modifiers: cannotInvestigateWhile((game, i) => inv(game, i).hand.length <= 4),
} satisfies CardScript;
