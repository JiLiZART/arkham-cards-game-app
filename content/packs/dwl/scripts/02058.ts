// The Experiment — when the enemy phase begins it readies (its objective, "if defeated, advance to act 3b", is the
// scenario script's)
import {
  card,
  type CardScript,
  type GameContext,
  ready,
  type ScriptRun,
} from "../../../../src/engine/api";

export default {
  abilities: [
    { kind: "forced", trigger: "phaseBegins", condition: { phase: "enemy" }, run: "ready" },
  ],
  fns: {
    ready(game: GameContext, run: ScriptRun) {
      if (card(game, run.source).exhausted) ready(game, run.source);
    },
  },
} satisfies CardScript;
