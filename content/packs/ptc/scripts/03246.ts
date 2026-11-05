// Leading the Way (The Pallid Mask, act 3a): the Blocked Passage's Forced ability is ignored (its script reads the act).
// Objective (the scenario's check): each undefeated investigator at the Blocked Passage. Back (The Secret Exit):
// Resolution 2.
import { type CardScript, type GameContext, queue, endScenario } from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "secretExit" }],
  fns: {
    secretExit(game: GameContext) {
      queue(game, endScenario({ id: "R2" }));
    },
  },
} satisfies CardScript;
