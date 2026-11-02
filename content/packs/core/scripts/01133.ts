// Graveyard — failing its test may move you to Rivertown
import {
  locationByName,
  push,
  type CardScript,
  type EffCtx,
  type GameContext,
  STEP,
} from "../../../../src/engine/api";

export default {
  fns: {
    moveToRivertown(game: GameContext, ctx: EffCtx) {
      const r = locationByName(game, "Rivertown");
      if (r) push(game, { t: STEP.Move, inv: ctx.you!, to: r.id });
    },
  },
} satisfies CardScript;
