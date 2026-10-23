// Mark of Elokoss — when your turn ends: 1 damage, on an asset you control if able
import {
  ask,
  controlled,
  def,
  emit,
  push,
  type CardScript,
  type EffCtx,
  type G,
  type InstId,
  type Step,
} from "../../../../src/engine/api";

export default {
  fns: {
    mark(g: G, ctx: EffCtx, _args: unknown, step?: Step) {
      const you = ctx.you!;
      const assets = controlled(g, you).filter((c) => (def(g, c.id).health ?? 0) > c.damage);
      if (!assets.length) {
        push(g, {
          t: "AssignDamage",
          inv: you,
          damage: 1,
          horror: 0,
          direct: false,
          source: ctx.source ?? null,
        });
        return;
      }
      const pick = ask<InstId>(
        g,
        step!,
        you,
        "target",
        "Mark of Elokoss: assign 1 damage to an asset",
        assets.map((c) => ({ id: c.id, label: def(g, c.id).name, card: c.id, value: c.id })),
        { auto: true, key: "chooseAsset" },
      );
      if (pick === undefined) return;
      g.s.cards[pick].damage++;
      emit(g, "assetDamage", `${def(g, pick).name} takes 1 damage`, {
        card: pick,
        inv: you,
        data: { damage: 1, horror: 0, source: ctx.source ?? null },
      });
      push(g, { t: "Script", code: "__engine", fn: "assetDefeatCheck", ctx: { you } });
    },
  },
} satisfies CardScript;
