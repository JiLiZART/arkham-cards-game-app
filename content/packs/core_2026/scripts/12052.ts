// Prestidigitation — play an Item asset from your hand for 2 less; when your turn ends, return an Item asset you control to your hand
import {
  ask,
  controlled,
  def,
  emit,
  inv,
  moveCard,
  playCost,
  push,
  uniqueInPlay,
  type CardScript,
  type EffCtx,
  type G,
  type InstId,
  type Step,
} from "../../../../src/engine/api";

const item = (g: G, id: InstId) =>
  def(g, id).type === "asset" && def(g, id).traits.includes("Item");

export default {
  abilities: [{ kind: "onPlay", condition: { yourTurn: true }, run: "trick" }],
  fns: {
    trick(g: G, ctx: EffCtx, _args: unknown, step?: Step) {
      const you = ctx.you!;
      const me = inv(g, you);
      const cost = (id: InstId) => Math.max(0, playCost(g, you, id) - 2);
      const pool = me.hand.filter(
        (h) => item(g, h) && !uniqueInPlay(g, h) && me.resources >= cost(h),
      );
      if (pool.length) {
        const pick = ask<InstId>(
          g,
          step!,
          you,
          "generic",
          "Prestidigitation: play an Item asset for 2 less",
          pool.map((id) => ({ id, label: def(g, id).name, card: id, value: id })),
          { auto: true, key: "chooseOne" },
        );
        if (pick === undefined) return;
        me.resources -= cost(pick);
        push(g, { t: "PlayCard", inv: you, card: pick, free: true });
      }
      push(g, {
        t: "Eff",
        effect: { op: "atTurnEnd", effects: [{ op: "script", fn: "returnItem" }] },
        ctx,
      });
    },
    returnItem(g: G, ctx: EffCtx, _args: unknown, step?: Step) {
      const you = ctx.you!;
      const items = controlled(g, you).filter((c) => item(g, c.id));
      if (!items.length) return;
      const pick = ask<InstId>(
        g,
        step!,
        you,
        "generic",
        "Prestidigitation: return an Item asset you control to your hand",
        items.map((c) => ({ id: c.id, label: def(g, c.id).name, card: c.id, value: c.id })),
        { auto: true, key: "chooseOne" },
      );
      if (pick === undefined) return;
      moveCard(g, pick, "hand", { inv: g.s.cards[pick].owner ?? you });
      emit(g, "returned", `${def(g, pick).name} returns to the hand`, { inv: you, card: pick });
    },
  },
} satisfies CardScript;
