// Out of Time (The Essex County Express, agenda 5) — back: each investigator is defeated and takes 1 mental trauma (→R2)
import {
  type CardScript,
  flags,
  type GameContext,
  inv,
  turnOrder,
  queue,
  defeatInvestigator,
} from "../../../../src/engine/api";
import { SUCKED_IN } from "../../../campaigns/the-dunwich-legacy/scripts/essex-county-express";

export default {
  abilities: [{ kind: "revelation", run: "back" }],
  fns: {
    back(game: GameContext) {
      // the last defeat ends the scenario through its allEliminated hook, in R2
      flags.setNamed(game, SUCKED_IN, true);
      const playing = turnOrder(game).filter((i) => inv(game, i).status === "playing");
      // a defeat by horror brings the mental trauma
      queue(game, ...playing.map((i) => defeatInvestigator({ inv: i, by: "horror" })));
    },
  },
} satisfies CardScript;
