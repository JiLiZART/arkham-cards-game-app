// Get the Engine Running! (The Essex County Express, act 2) — objective: no clues in the Engine Car (the scenario's
// checkObjectives); back: (→R1)
import { type CardScript, type GameContext, queue, endScenario } from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "back" }],
  fns: {
    back(game: GameContext) {
      queue(game, endScenario({ id: "R1" }));
    },
  },
} satisfies CardScript;
