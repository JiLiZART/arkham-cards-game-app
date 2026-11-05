// Campus Safety (Extracurricular Activity, act 3) — its objective is The Experiment's (the scenario script); back: (→R3)
import { type CardScript, type GameContext, queue, endScenario } from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "back" }],
  fns: {
    back(game: GameContext) {
      queue(game, endScenario({ id: "R3" }));
    },
  },
} satisfies CardScript;
