// Dismal Curse (Dim Carcosa): test [willpower] (3), +2 difficulty with no remaining sanity; a failure takes 2 damage,
// 4 with horror on you greater than twice your sanity.
import {
  type CardScript,
  type GameContext,
  remainingSanity,
  type ScriptRun,
  queue,
  dealDamage,
  resolveEffect,
} from "../../../../src/engine/api";
import { overTwiceSanity } from "../../../campaigns/the-path-to-carcosa/scripts/dim-carcosa";

export default {
  abilities: [{ kind: "revelation", run: "curse" }],
  fns: {
    curse(game: GameContext, run: ScriptRun) {
      queue(
        game,
        resolveEffect({
          effect: {
            op: "skillTest",
            skill: "willpower",
            difficulty: remainingSanity(game, run.you) === 0 ? 5 : 3,
            onFail: [{ op: "script", fn: "hurt" }],
          },
          ctx: run.ctx,
        }),
      );
    },
    hurt(game: GameContext, run: ScriptRun) {
      const n = overTwiceSanity(game, run.you) ? 4 : 2;
      queue(
        game,
        dealDamage({ inv: run.you, damage: n, horror: 0, direct: false, source: run.source }),
      );
    },
  },
} satisfies CardScript;
