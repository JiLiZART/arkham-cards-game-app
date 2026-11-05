// All is One (Lost in Time and Space, agenda 1) — its forced horror is the scenario's `encounterMove`; back: the encounter
// discard pile shuffled in, cards discarded until a location, which the lead resolves; if the students were not saved,
// 1 horror on each investigator
import {
  campaignLogOf,
  type CardScript,
  dealDamage,
  type GameContext,
  inv,
  leadInvestigator,
  queue,
  type Queued,
  reshuffleDiscard,
  turnOrder,
} from "../../../../src/engine/api";
import {
  discardUntilLocation,
  revelationOf,
  SHARED,
} from "../../../campaigns/the-dunwich-legacy/scripts/lost-in-time-and-space";

/** Familiar Echoes and The Price of Failure: the lead resolves the revelation of a location found in the encounter deck */
export function echoes(game: GameContext): Queued[] {
  reshuffleDiscard(game, "encounter");
  const loc = discardUntilLocation(game);
  return loc ? revelationOf(game, loc, leadInvestigator(game)) : [];
}

export default {
  abilities: [{ kind: "revelation", run: "back" }],
  fns: {
    ...SHARED.fns,
    back(game: GameContext) {
      const found = echoes(game);
      const horror = campaignLogOf(game).failedToSaveStudents
        ? turnOrder(game)
            .filter((i) => inv(game, i).status === "playing")
            .map((i) => dealDamage({ inv: i, damage: 0, horror: 1, direct: false, source: null }))
        : [];
      queue(game, ...found, ...horror);
    },
  },
} satisfies CardScript;
