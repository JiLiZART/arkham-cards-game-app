// Hospital Debts — earn 2 fewer experience if fewer than 6 resources on it at game end
import {
  card,
  type CardScript,
  type EffCtx,
  flags,
  type GameContext,
} from "../../../../src/engine/api";

export default {
  hooks: {
    gameEnd(game: GameContext, ctx: EffCtx) {
      const c = card(game, ctx.source!);
      if (c.resources < 6 && c.controller) flags.xp.add(game, c.controller, -2);
    },
  },
} satisfies CardScript;
