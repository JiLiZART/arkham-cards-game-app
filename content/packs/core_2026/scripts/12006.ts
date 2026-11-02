// Dead Ends — found by a search of its deck, it is drawn and cancels the search (effects.ts); 2 fewer experience if it is in the hand when the game ends
import {
  card,
  type CardScript,
  type EffCtx,
  flags,
  type GameContext,
} from "../../../../src/engine/api";

export default {
  hooks: {
    searched() {},
    gameEnd(game: GameContext, ctx: EffCtx) {
      const c = card(game, ctx.source!);
      if (c.zone !== "hand" || !c.owner) return;
      flags.xp.add(game, c.owner, -2);
    },
  },
} satisfies CardScript;
