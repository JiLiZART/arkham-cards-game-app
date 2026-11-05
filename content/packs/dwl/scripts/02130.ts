// Administration Office (resources) — you cannot investigate it while you have 4 or fewer resources. 02131 is the same
// office counting the cards in your hand
import {
  type CardScript,
  type GameContext,
  type InstId,
  type InvId,
  inv,
  invsAt,
} from "../../../../src/engine/api";

/** the investigators here who have too little to investigate it: `cannotInvestigate` while `short` holds */
export const cannotInvestigateWhile =
  (short: (game: GameContext, i: InvId) => boolean) => (game: GameContext, office: InstId) =>
    invsAt(game, office)
      .filter((i) => short(game, i))
      .map((i) => ({ target: i, mod: { flag: "cannotInvestigate" as const } }));

export default {
  modifiers: cannotInvestigateWhile((game, i) => inv(game, i).resources <= 4),
} satisfies CardScript;
