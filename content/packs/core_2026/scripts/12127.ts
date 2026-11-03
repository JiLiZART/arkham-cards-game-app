// Extraplanar Visions — test willpower or intellect (X: the cards in your hand); fail: 1 damage and a random discard
import {
  inv,
  type CardScript,
  type GameContext,
  type ScriptRun,
  queue,
  resolveEffect,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "visions" }],
  fns: {
    visions(game: GameContext, run: ScriptRun) {
      queue(
        game,
        resolveEffect({
          effect: {
            op: "skillTest",
            skill: ["willpower", "intellect"],
            difficulty: inv(game, run.you).hand.length,
            onFail: [
              { op: "takeDamage", amount: 1 },
              { op: "discardFromHand", amount: 1, random: true },
            ],
          },
          ctx: run.ctx,
        }),
      );
    },
  },
} satisfies CardScript;
