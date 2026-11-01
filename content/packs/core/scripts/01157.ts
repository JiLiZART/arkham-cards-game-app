// Umôrdhoth — readies at the end of each investigator's turn
import { type CardScript, type EffCtx, type G, ready } from "../../../../src/engine/api";

export default {
  fns: {
    ready(g: G, ctx: EffCtx) {
      ready(g, ctx.source!);
    },
  },
} satisfies CardScript;
