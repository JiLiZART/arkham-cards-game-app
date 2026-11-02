// Mutated Experiment — defeated: each investigator at its location takes 1 horror
import {
  cardIf,
  type CardScript,
  type EffCtx,
  type GameContext,
  invsAt,
  push,
  STEP,
} from "../../../../src/engine/api";

export default {
  fns: {
    spill(game: GameContext, ctx: EffCtx) {
      const loc = cardIf(game, ctx.source!)?.location ?? null;
      for (const i of invsAt(game, loc))
        push(game, {
          t: STEP.AssignDamage,
          inv: i,
          damage: 0,
          horror: 1,
          direct: false,
          source: ctx.source!,
        });
    },
  },
} satisfies CardScript;
