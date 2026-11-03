// Mutated Experiment — defeated: each investigator at its location takes 1 horror
import {
  cardIf,
  type CardScript,
  type GameContext,
  invsAt,
  type ScriptRun,
  queue,
  dealDamage,
} from "../../../../src/engine/api";

export default {
  fns: {
    spill(game: GameContext, run: ScriptRun) {
      const loc = cardIf(game, run.source)?.location ?? null;
      for (const i of invsAt(game, loc))
        queue(
          game,
          dealDamage({ inv: i, damage: 0, horror: 1, direct: false, source: run.source }),
        );
    },
  },
} satisfies CardScript;
