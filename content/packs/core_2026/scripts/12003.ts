// In Harm's Way — worn out at 3 damage; 1 physical trauma when the game ends
import {
  addCounter,
  card,
  cardIf,
  type CardScript,
  discard,
  type EffCtx,
  type GameContext,
} from "../../../../src/engine/api";

export default {
  fns: {
    worn(game: GameContext, ctx: EffCtx) {
      const c = cardIf(game, ctx.source!);
      if (c?.zone === "threat" && c.damage >= 3) discard(game, c.id);
    },
  },
  hooks: {
    gameEnd(game: GameContext, ctx: EffCtx) {
      const c = card(game, ctx.source!);
      if (c.zone === "threat" && c.controller) addCounter(game, c.controller, "physicalTrauma", 1);
    },
  },
} satisfies CardScript;
