// Double or Nothing — the test's difficulty is doubled while it is committed; a success resolves once more (the
// action's outcome and the other "if this test is successful" effects; reactions and token effects once)
import {
  type CardScript,
  type GameContext,
  repeatSuccess,
  type ScriptRun,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "onPlay", condition: { succeededBy: { min: 0 } }, run: "twice" }],
  difficulty: (_game: GameContext, _card: string, d: number) => d * 2,
  fns: {
    twice(game: GameContext, run: ScriptRun) {
      repeatSuccess(game, run.source);
    },
  },
} satisfies CardScript;
