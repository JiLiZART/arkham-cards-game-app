// Ritual Site — at the end of the round, refill to 2 clues per investigator
import {
  card,
  type CardScript,
  type EffCtx,
  type G,
  setCounter,
  turnOrder,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "forced", trigger: "roundEnds", run: "refill" }],
  fns: {
    refill(g: G, ctx: EffCtx) {
      const c = card(g, ctx.source!);
      const want = 2 * turnOrder(g).length;
      if (c.zone === "location" && c.clues < want) setCounter(g, c.id, "clues", want);
    },
  },
} satisfies CardScript;
