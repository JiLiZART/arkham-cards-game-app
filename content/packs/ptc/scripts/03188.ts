// Walls Closing In — test [willpower] (X), X the shroud of your location. If you fail, take 1 horror for each point you
// failed by, or place a random set-aside Monster beneath the act deck.
import {
  type CardScript,
  type GameContext,
  inv,
  shroud,
  type ScriptRun,
  queue,
  resolveEffect,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "walls" }],
  fns: {
    walls(game: GameContext, run: ScriptRun) {
      const loc = inv(game, run.you).location;
      const x = loc ? shroud(game, loc) : 0;
      queue(
        game,
        resolveEffect({
          effect: {
            op: "skillTest",
            skill: "willpower",
            difficulty: Number.isFinite(x) ? x : 0,
            onFail: [
              {
                op: "chooseOne",
                options: [
                  {
                    label: "Take 1 horror for each point you failed by",
                    effects: [{ op: "takeHorror", amount: "failBy" }],
                  },
                  {
                    label: "Place a random set-aside Monster enemy beneath the act deck",
                    condition: { script: "monstersAside" },
                    effects: [{ op: "script", fn: "monsterBeneath" }],
                  },
                ],
              },
            ],
          },
          ctx: { ...run.ctx, you: run.you },
        }),
      );
    },
  },
} satisfies CardScript;
