// Vast Expanse (Lost in Time and Space) — revelation: with no [[Extradimensional]] location in play it gains surge;
// otherwise test willpower (X), X those locations (max 5), 1 horror per point failed
import {
  type CardScript,
  type GameContext,
  locations,
  queue,
  resolveEffect,
  type ScriptRun,
} from "../../../../src/engine/api";
import {
  extradimensional,
  SHARED,
} from "../../../campaigns/the-dunwich-legacy/scripts/lost-in-time-and-space";

export default {
  abilities: [{ kind: "revelation", run: "expanse" }],
  fns: {
    ...SHARED.fns,
    expanse(game: GameContext, run: ScriptRun) {
      const x = Math.min(5, locations(game).filter((l) => extradimensional(game, l.id)).length);
      queue(
        game,
        resolveEffect({
          effect: x
            ? {
                op: "skillTest",
                skill: "willpower",
                difficulty: x,
                perPointFailed: [{ op: "takeHorror", amount: 1 }],
              }
            : { op: "surge" },
          ctx: run.ctx,
        }),
      );
    },
  },
} satisfies CardScript;
