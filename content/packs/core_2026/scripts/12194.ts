// Dissonance — choose a card type: discard each non-weakness card of that type from your hand
import {
  ask,
  def,
  discard,
  inv,
  type CardScript,
  type EffCtx,
  type G,
  type Step,
} from "../../../../src/engine/api";

const TYPES = ["asset", "event", "skill"] as const;

export default {
  fns: {
    dissonance(g: G, ctx: EffCtx, _args: unknown, step?: Step) {
      const me = inv(g, ctx.you!);
      const type = ask<string>(
        g,
        step!,
        ctx.you!,
        "generic",
        "Dissonance: choose a card type to discard",
        TYPES.map((t) => ({ id: t, label: t[0].toUpperCase() + t.slice(1), value: t })),
        { key: "chooseOne" },
      );
      if (type === undefined) return;
      for (const h of me.hand.slice())
        if (def(g, h).type === type && !def(g, h).subtype) discard(g, h);
    },
  },
} satisfies CardScript;
