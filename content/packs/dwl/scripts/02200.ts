// The Chamber of the Beast (Blood on the Altar, act 2) — its objectives (Silas Bishop defeated: R1; no clues in The
// Hidden Chamber: advance) are the scenario's; back: (→R2) if The Necronomicon is in play, else (→R3)
import {
  type CardScript,
  findByCode,
  type GameContext,
  ZONE,
  queue,
  endScenario,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "back" }],
  fns: {
    back(game: GameContext) {
      const necronomicon = findByCode(game, "02140", [ZONE.Play]);
      queue(game, endScenario({ id: necronomicon ? "R2" : "R3" }));
    },
  },
} satisfies CardScript;
