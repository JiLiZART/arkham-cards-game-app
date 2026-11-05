// Crashing Floods (Black Stars Rise) — Revelation: test [agility] (3). If you fail, take 1 damage and lose 1 action
// with agenda 1a in play, 2 and 2 with agenda 2a, 3 and 3 with act 3a or agenda 3a.
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
          skill: "agility",
          difficulty: 3,
          onFail: [{ op: "script", fn: "flood" }],
        },
      ],
    },
  ],
  fns: {
    flood(game: GameContext, run: ScriptRun) {
      const n = stageOf(game, "a");
      if (!n) return;
      queue(
        game,
        dealDamage({ inv: run.you, damage: n, horror: 0, direct: false, source: run.source }),
        resolveEffect({
          effect: { op: "loseActions", amount: n },
          ctx: { ...run.ctx, you: run.you },
        }),
      );
    },
  },
} satisfies CardScript;
