// Quiet Halls (Extracurricular Activity, agenda 1) — back: horror by the size of each discard pile; after The House
// Always Wins, agenda 2 is skipped to its back
import {
  campaignLogOf,
  type CardScript,
  deckCards,
  type GameContext,
  inv,
  moveCard,
  turnOrder,
  ZONE,
  queue,
  dealDamage,
  runScript,
} from "../../../../src/engine/api";

/** The House Always Wins was played before: every one of its resolutions records what became of Dr. Francis Morgan */
export const thawCompleted = (game: GameContext) => {
  const log = campaignLogOf(game);
  return !!log.francisMorganKidnapped || !!log.francisMorganRescued;
};

export default {
  abilities: [{ kind: "revelation", run: "back" }],
  fns: {
    back(game: GameContext) {
      const horror = (i: string) => {
        const n = inv(game, i).discard.length;
        return n >= 10 ? 2 : n >= 5 ? 1 : 0;
      };
      const steps = turnOrder(game)
        .filter((i) => inv(game, i).status === "playing" && horror(i))
        .map((i) =>
          dealDamage({ inv: i, damage: 0, horror: horror(i), direct: false, source: null }),
        );
      // "advance directly to agenda 2b": agenda 2 never becomes current, its back resolves now
      const next = thawCompleted(game) ? deckCards(game, "agenda")[0] : undefined;
      if (next) {
        moveCard(game, next, ZONE.Removed);
        steps.push(runScript({ code: "02043", fn: "back", ctx: { source: next } }));
      }
      queue(game, ...steps);
    },
  },
} satisfies CardScript;
