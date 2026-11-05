// Quick Thinking — a success by 2 or more: once the test has resolved, its committer may take an action as if it were
// their turn, counting toward none of their actions
import {
  afterTest,
  bonusAction,
  type CardScript,
  type GameContext,
  type ScriptRun,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "onPlay", condition: { succeededBy: { min: 2 } }, run: "quick" }],
  fns: {
    quick(game: GameContext, run: ScriptRun) {
      afterTest(game, bonusAction({ inv: run.you }));
    },
  },
} satisfies CardScript;
