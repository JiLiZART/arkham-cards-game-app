// Northside — gain 2 clues from the token pool
import { emit, inv, type CardScript, type EffCtx, type G } from "../../../../src/engine/api";

export default {
  fns: {
    gainClues(g: G, ctx: EffCtx) {
      inv(g, ctx.you!).clues += 2;
      emit(g, "clues", `${inv(g, ctx.you!).name} gains 2 clues`, { inv: ctx.you!, data: { n: 2 } });
    },
  },
} satisfies CardScript;
