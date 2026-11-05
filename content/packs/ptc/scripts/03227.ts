// Lost Soul (A Phantom of Truth's weakness) — with as much Doubt as Conviction, test [intellect] (X) where X is your
// [willpower]; with more Conviction, test [willpower] (X) where X is your [intellect]. A failure: 2 damage.
import {
  type CardScript,
  type GameContext,
  type ScriptRun,
  skillValue,
  queue,
  resolveEffect,
} from "../../../../src/engine/api";
import { convictionLeads } from "../../../campaigns/the-path-to-carcosa/scripts/a-phantom-of-truth";

export default {
  abilities: [{ kind: "revelation", run: "lostSoul" }],
  fns: {
    lostSoul(game: GameContext, run: ScriptRun) {
      const [skill, against] = convictionLeads(game)
        ? (["willpower", "intellect"] as const)
        : (["intellect", "willpower"] as const);
      queue(
        game,
        resolveEffect({
          effect: {
            op: "skillTest",
            skill,
            difficulty: skillValue(game, run.you, against),
            onFail: [{ op: "takeDamage", amount: 2 }],
          },
          ctx: run.ctx,
        }),
      );
    },
  },
} satisfies CardScript;
