// Torment — name a card type: each investigator discards 1 card of that type
import {
  activeInvs,
  ask,
  def,
  discard,
  inv,
  push,
  type CardScript,
  type EffCtx,
  type G,
  type InstId,
  type Step,
} from "../../../../src/engine/api";

const TYPES = ["asset", "event", "skill"] as const;

export default {
  fns: {
    torment(g: G, ctx: EffCtx, _args: unknown, step?: Step) {
      const type = ask<string>(
        g,
        step!,
        ctx.you!,
        "generic",
        "Torment: name a card type",
        TYPES.map((t) => ({ id: t, label: t[0].toUpperCase() + t.slice(1), value: t })),
        { key: "chooseOne" },
      );
      if (type === undefined) return;
      for (const i of activeInvs(g))
        push(g, {
          t: "Script",
          code: "12195",
          fn: "discardOne",
          ctx: { ...ctx, inv: i },
          args: type,
        });
    },
    discardOne(g: G, ctx: EffCtx, type: string, step?: Step) {
      const who = ctx.inv!;
      const cards = inv(g, who).hand.filter((h) => def(g, h).type === type);
      if (!cards.length) return;
      const pick = ask<InstId>(
        g,
        step!,
        who,
        "generic",
        `Torment: discard 1 ${type}`,
        cards.map((h) => ({ id: h, label: def(g, h).name, card: h, value: h })),
        { auto: true, key: "discardN", vars: { n: 1 } },
      );
      if (pick === undefined) return;
      discard(g, pick);
    },
  },
} satisfies CardScript;
