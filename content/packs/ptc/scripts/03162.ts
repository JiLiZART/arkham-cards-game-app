// His Domain (The Unspeakable Oath, agenda 3) — when an enemy would be placed beneath the act deck it is shuffled into
// the encounter deck instead (`monsterBeneath`, 03159). Back: each investigator who has not resigned is defeated;
// those who resigned advance to act 4b (the scenario's `allEliminated`).
import {
  activeInvs,
  type CardScript,
  type GameContext,
  queue,
  defeatInvestigator,
} from "../../../../src/engine/api";
import { oathAgenda } from "./03160";

export default oathAgenda({
  abilities: [{ kind: "revelation", run: "masks" }],
  fns: {
    masks(game: GameContext) {
      for (const i of activeInvs(game)) queue(game, defeatInvestigator({ inv: i, by: "effect" }));
    },
  },
}) satisfies CardScript;
