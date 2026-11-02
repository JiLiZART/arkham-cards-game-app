// The Necronomicon — move 1 horror from it to Daisy; discard it when empty
import {
  addCounter,
  card,
  type CardScript,
  discard,
  type EffCtx,
  type GameContext,
  push,
  STEP,
} from "../../../../src/engine/api";

export default {
  abilities: [
    { kind: "action", label: "The Necronomicon: move 1 horror to yourself", run: "moveHorror" },
  ],
  fns: {
    moveHorror(game: GameContext, ctx: EffCtx) {
      const c = card(game, ctx.source!);
      if (c.horror <= 0) return;
      addCounter(game, c.id, "horror", -1);
      push(game, {
        t: STEP.AssignDamage,
        inv: ctx.you!,
        damage: 0,
        horror: 1,
        direct: true,
        source: c.id,
      });
      if (c.horror === 0) discard(game, c.id);
    },
  },
} satisfies CardScript;
