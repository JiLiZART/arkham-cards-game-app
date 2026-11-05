// Worlds Merge (Black Stars Rise) — Revelation: test [willpower] (3). If you fail, take 1 horror and discard 1 card from
// your hand with agenda 1c in play, 2 and 2 with agenda 2c, 3 and 3 with act 3c or agenda 3c.
import {
  type CardScript,
  type GameContext,
  type ScriptRun,
  queue,
  dealDamage,
  resolveEffect,
} from "../../../../src/engine/api";
import { stageOf } from "../../../campaigns/the-path-to-carcosa/scripts/black-stars-rise";

export default {
  abilities: [
    {
      kind: "revelation",
      effects: [
        {
          op: "skillTest",
          skill: "willpower",
          difficulty: 3,
          onFail: [{ op: "script", fn: "merge" }],
        },
      ],
    },
  ],
  fns: {
    merge(game: GameContext, run: ScriptRun) {
      const n = stageOf(game, "c");
      if (!n) return;
      queue(
        game,
        dealDamage({ inv: run.you, damage: 0, horror: n, direct: false, source: run.source }),
        resolveEffect({
          effect: { op: "discardFromHand", amount: n },
          ctx: { ...run.ctx, you: run.you },
        }),
      );
    },
  },
} satisfies CardScript;
