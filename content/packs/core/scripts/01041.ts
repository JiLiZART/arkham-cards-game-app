// Disc of Itzamna — discard the non-Elite enemy that just spawned at your location
import {
  cardIf,
  type CardScript,
  discard,
  type GameContext,
  type ScriptRun,
} from "../../../../src/engine/api";

export default {
  fns: {
    discardEnemy(game: GameContext, run: ScriptRun) {
      if (run.ctx.enemy && cardIf(game, run.ctx.enemy)?.zone === "enemy")
        discard(game, run.ctx.enemy);
    },
  },
} satisfies CardScript;
