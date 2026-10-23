// St. Mary's Hospital — heal up to 2 damage from among investigators and Ally assets here, a point at a time
import { push, type CardScript, type EffCtx, type G } from "../../../../src/engine/api";

export default {
  fns: {
    heal2(g: G, ctx: EffCtx) {
      const point = { op: "heal" as const, damage: 1, targetAlly: "atLocation" as const };
      push(g, { t: "Effects", effects: [point, point], ctx });
    },
  },
} satisfies CardScript;
