// Prestidigitation — play an Item asset from your hand for 2 less; when your turn ends, return an Item asset you control to your hand
import {
  addCounter,
  ask,
  card,
  type CardScript,
  controlled,
  def,
  type EffCtx,
  emit,
  type GameContext,
  type InstId,
  inv,
  moveCard,
  playCost,
  push,
  type Step,
  uniqueInPlay,
  EVENT,
  ZONE,
  CHOICE,
  STEP,
} from "../../../../src/engine/api";

const item = (game: GameContext, id: InstId) =>
  def(game, id).type === "asset" && def(game, id).traits.includes("Item");

export default {
  abilities: [{ kind: "onPlay", condition: { yourTurn: true }, run: "trick" }],
  fns: {
    trick(game: GameContext, ctx: EffCtx, _args: unknown, step?: Step) {
      const you = ctx.you!;
      const me = inv(game, you);
      const cost = (id: InstId) => Math.max(0, playCost(game, you, id) - 2);
      const pool = me.hand.filter(
        (h) => item(game, h) && !uniqueInPlay(game, h) && me.resources >= cost(h),
      );
      if (pool.length) {
        const pick = ask<InstId>(
          game,
          step!,
          you,
          CHOICE.Generic,
          "Prestidigitation: play an Item asset for 2 less",
          pool.map((id) => ({ id, label: def(game, id).name, card: id, value: id })),
          { auto: true, key: "chooseOne" },
        );
        if (pick === undefined) return;
        addCounter(game, me.id, "resources", -cost(pick));
        push(game, { t: STEP.PlayCard, inv: you, card: pick, free: true });
      }
      push(game, {
        t: STEP.Eff,
        effect: { op: "atTurnEnd", effects: [{ op: "script", fn: "returnItem" }] },
        ctx,
      });
    },
    returnItem(game: GameContext, ctx: EffCtx, _args: unknown, step?: Step) {
      const you = ctx.you!;
      const items = controlled(game, you).filter((c) => item(game, c.id));
      if (!items.length) return;
      const pick = ask<InstId>(
        game,
        step!,
        you,
        CHOICE.Generic,
        "Prestidigitation: return an Item asset you control to your hand",
        items.map((c) => ({ id: c.id, label: def(game, c.id).name, card: c.id, value: c.id })),
        { auto: true, key: "chooseOne" },
      );
      if (pick === undefined) return;
      moveCard(game, pick, ZONE.Hand, { inv: card(game, pick).owner ?? you });
      emit(game, EVENT.Returned, `${def(game, pick).name} returns to the hand`, {
        inv: you,
        card: pick,
      });
    },
  },
} satisfies CardScript;
