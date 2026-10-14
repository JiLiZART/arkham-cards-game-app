// Umôrdhoth — readies at the end of each investigator's turn
import { card, type CardScript, type EffCtx, type G } from "../../../../src/engine/api";

export default {
  fns: {
    ready(g: G, ctx: EffCtx) {
      card(g, ctx.source!).exhausted = false;
    },
  },
} satisfies CardScript;
