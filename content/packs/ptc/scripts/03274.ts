// Black Stars Rise's reference card — Hard/Expert tablet: "If you do not succeed by at least 1, place 1 doom on each
// agenda", once the test is over: a failure, or a success by 0. (Return to Black Stars Rise plays with this card.)
import {
  type CardScript,
  type GameContext,
  type ScriptRun,
  queue,
  resolveEffect,
} from "../../../../src/engine/api";

export default {
  fns: {
    doomUnlessByOne(game: GameContext, run: ScriptRun) {
      if (run.ctx.succeedBy !== undefined && run.ctx.succeedBy >= 1) return;
      queue(
        game,
        resolveEffect({
          effect: { op: "placeDoom", amount: 1, on: "eachAgenda" },
          ctx: { ...run.ctx, you: run.you },
        }),
      );
    },
  },
} satisfies CardScript;
