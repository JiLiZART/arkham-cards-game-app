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
  type GameContext,
  type InstId,
  type Step,
  CHOICE,
  STEP,
} from "../../../../src/engine/api";

const TYPES = ["asset", "event", "skill"] as const;

export default {
  fns: {
    torment(game: GameContext, ctx: EffCtx, _args: unknown, step?: Step) {
      const type = ask<string>(
        game,
        step!,
        ctx.you!,
        CHOICE.Generic,
        "Torment: name a card type",
        TYPES.map((t) => ({ id: t, label: t[0].toUpperCase() + t.slice(1), value: t })),
        { key: "chooseOne" },
      );
      if (type === undefined) return;
      for (const i of activeInvs(game))
        push(game, {
          t: STEP.Script,
          code: "12195",
          fn: "discardOne",
          ctx: { ...ctx, inv: i },
          args: type,
        });
    },
    discardOne(game: GameContext, ctx: EffCtx, type: string, step?: Step) {
      const who = ctx.inv!;
      const cards = inv(game, who).hand.filter((h) => def(game, h).type === type);
      if (!cards.length) return;
      const pick = ask<InstId>(
        game,
        step!,
        who,
        CHOICE.Generic,
        `Torment: discard 1 ${type}`,
        cards.map((h) => ({ id: h, label: def(game, h).name, card: h, value: h })),
        { auto: true, key: "discardN", vars: { n: 1 } },
      );
      if (pick === undefined) return;
      discard(game, pick);
    },
  },
} satisfies CardScript;
