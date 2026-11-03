// Hospital Debts — earn 2 fewer experience if fewer than 6 resources on it at game end
import {
  card,
  type CardScript,
  flags,
  type GameContext,
  type HookRun,
} from "../../../../src/engine/api";

export default {
  hooks: {
    gameEnd(game: GameContext, run: HookRun) {
      const c = card(game, run.source);
      if (c.resources < 6 && c.controller) flags.xp.add(game, c.controller, -2);
    },
  },
} satisfies CardScript;
