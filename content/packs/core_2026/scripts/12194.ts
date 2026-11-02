// Dissonance — choose a card type: discard each non-weakness card of that type from your hand
import {
  ask,
  def,
  discard,
  inv,
  type CardScript,
  type EffCtx,
  type GameContext,
  type Step,
  CHOICE,
} from "../../../../src/engine/api";

const TYPES = ["asset", "event", "skill"] as const;

export default {
  fns: {
    dissonance(game: GameContext, ctx: EffCtx, _args: unknown, step?: Step) {
      const me = inv(game, ctx.you!);
      const type = ask<string>(
        game,
        step!,
        ctx.you!,
        CHOICE.Generic,
        "Dissonance: choose a card type to discard",
        TYPES.map((t) => ({ id: t, label: t[0].toUpperCase() + t.slice(1), value: t })),
        { key: "chooseOne" },
      );
      if (type === undefined) return;
      for (const h of me.hand.slice())
        if (def(game, h).type === type && !def(game, h).subtype) discard(game, h);
    },
  },
} satisfies CardScript;
