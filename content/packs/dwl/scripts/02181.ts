// Broken Rails — revelation: each investigator at your location loses 1 action; each of them with 4 or more damage also
// discards an asset they control
import {
  type CardScript,
  type GameContext,
  inv,
  invsAt,
  type ScriptRun,
  queue,
  resolveEffects,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "derail" }],
  fns: {
    derail(game: GameContext, run: ScriptRun) {
      queue(
        game,
        ...invsAt(game, inv(game, run.you).location).map((i) =>
          resolveEffects({
            effects: [
              { op: "loseActions", amount: 1 },
              ...(inv(game, i).damage >= 4 ? [{ op: "discardAsset" as const }] : []),
            ],
            ctx: { ...run.ctx, you: i },
          }),
        ),
      );
    },
  },
} satisfies CardScript;
