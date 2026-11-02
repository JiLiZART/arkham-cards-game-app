// Extraplanar Visions — test willpower or intellect (X: the cards in your hand); fail: 1 damage and a random discard
import {
  inv,
  push,
  type CardScript,
  type EffCtx,
  type GameContext,
  STEP,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "visions" }],
  fns: {
    visions(game: GameContext, ctx: EffCtx) {
      push(game, {
        t: STEP.Eff,
        effect: {
          op: "skillTest",
          skill: ["willpower", "intellect"],
          difficulty: inv(game, ctx.you!).hand.length,
          onFail: [
            { op: "takeDamage", amount: 1 },
            { op: "discardFromHand", amount: 1, random: true },
          ],
        },
        ctx,
      });
    },
  },
} satisfies CardScript;
