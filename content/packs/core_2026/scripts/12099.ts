// The Nameless Lurker — when the investigation phase ends, if it is ready with no doom: 1 doom on it
import {
  cardIf,
  type CardScript,
  currentPhase,
  type EffCtx,
  type GameContext,
  push,
  STEP,
} from "../../../../src/engine/api";

export default {
  fns: {
    lurk(game: GameContext, ctx: EffCtx) {
      const e = cardIf(game, ctx.source!);
      if (
        currentPhase(game) === "investigation" &&
        e?.zone === "enemy" &&
        !e.exhausted &&
        e.doom === 0
      )
        push(game, { t: STEP.PlaceDoom, card: e.id, n: 1 });
    },
  },
} satisfies CardScript;
