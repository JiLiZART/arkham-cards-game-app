// Ritual Site — at the end of the round, refill to 2 clues per investigator
import {
  card,
  type CardScript,
  type EffCtx,
  type GameContext,
  setCounter,
  turnOrder,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "forced", trigger: "roundEnds", run: "refill" }],
  fns: {
    refill(game: GameContext, ctx: EffCtx) {
      const c = card(game, ctx.source!);
      const want = 2 * turnOrder(game).length;
      if (c.zone === "location" && c.clues < want) setCounter(game, c.id, "clues", want);
    },
  },
} satisfies CardScript;
