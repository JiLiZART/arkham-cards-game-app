// Arousing Suspicions — 1 doom on each Criminal enemy at your location; with none there, you lose 2 resources
import {
  type CardScript,
  def,
  enemiesAt,
  type GameContext,
  inv,
  type ScriptRun,
  queue,
  placeDoom,
  resolveEffect,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "suspicions" }],
  fns: {
    suspicions(game: GameContext, run: ScriptRun) {
      const criminals = enemiesAt(game, inv(game, run.you).location).filter((e) =>
        def(game, e.id).traits.includes("Criminal"),
      );
      if (criminals.length) queue(game, ...criminals.map((e) => placeDoom({ card: e.id, n: 1 })));
      else
        queue(
          game,
          resolveEffect({
            effect: { op: "loseResources", amount: 2 },
            ctx: { ...run.ctx, you: run.you },
          }),
        );
    },
  },
} satisfies CardScript;
