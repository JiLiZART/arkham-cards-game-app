// Eyes in the Walls (The Pallid Mask) — test [willpower] (3); 1 horror per point failed, divided as evenly as possible
// among the cards that can take it.
import {
  type CardScript,
  type GameContext,
  type ScriptRun,
  queue,
  dealDamage,
} from "../../../../src/engine/api";

export default {
  abilities: [
    {
      kind: "revelation",
      effects: [
        {
          op: "skillTest",
          skill: "willpower",
          difficulty: 3,
          onFail: [{ op: "script", fn: "eyes" }],
        },
      ],
    },
  ],
  fns: {
    eyes(game: GameContext, run: ScriptRun) {
      const n = run.ctx.failBy ?? 0;
      if (n)
        queue(
          game,
          dealDamage({
            inv: run.you,
            damage: 0,
            horror: n,
            direct: false,
            source: run.source,
            evenly: true,
          }),
        );
    },
  },
} satisfies CardScript;
