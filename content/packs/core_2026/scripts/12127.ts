// Extraplanar Visions — test willpower or intellect (X: the cards in your hand); fail: 1 damage and a random discard
import { inv, push, type CardScript, type EffCtx, type G } from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "visions" }],
  fns: {
    visions(g: G, ctx: EffCtx) {
      push(g, {
        t: "Eff",
        effect: {
          op: "skillTest",
          skill: ["willpower", "intellect"],
          difficulty: inv(g, ctx.you!).hand.length,
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
