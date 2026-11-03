// Prestidigitation — play an Item asset from your hand for 2 less; when your turn ends, return an Item asset you control to your hand
import {
  addCounter,
  card,
  type CardScript,
  controlled,
  def,
  emit,
  type GameContext,
  type InstId,
  inv,
  moveCard,
  playCost,
  push,
  uniqueInPlay,
  EVENT,
  ZONE,
  CHOICE,
  STEP,
  type ScriptRun,
} from "../../../../src/engine/api";

const item = (game: GameContext, id: InstId) =>
  def(game, id).type === "asset" && def(game, id).traits.includes("Item");

export default {
  abilities: [{ kind: "onPlay", condition: { yourTurn: true }, run: "trick" }],
  fns: {
    trick(game: GameContext, run: ScriptRun) {
      const you = run.you;
      const me = inv(game, you);
      const cost = (id: InstId) => Math.max(0, playCost(game, you, id) - 2);
      const pool = me.hand.filter(
        (h) => item(game, h) && !uniqueInPlay(game, h) && me.resources >= cost(h),
      );
      if (pool.length) {
        const pick = run.choose<InstId>(
          pool.map((id) => ({ id, label: def(game, id).name, card: id, value: id })),
          { text: "Prestidigitation: play an Item asset for 2 less", key: "chooseOne" },
          { kind: CHOICE.Generic, who: you },
        );
        addCounter(game, me.id, "resources", -cost(pick));
        push(game, { t: STEP.PlayCard, inv: you, card: pick, free: true });
      }
      push(game, {
        t: STEP.Eff,
        effect: { op: "atTurnEnd", effects: [{ op: "script", fn: "returnItem" }] },
        ctx: run.ctx,
      });
    },
    returnItem(game: GameContext, run: ScriptRun) {
      const you = run.you;
      const items = controlled(game, you).filter((c) => item(game, c.id));
      if (!items.length) return;
      const pick = run.chooseCard(
        items.map((c) => c.id),
        {
          text: "Prestidigitation: return an Item asset you control to your hand",
          key: "chooseOne",
        },
        { kind: CHOICE.Generic, who: you },
      );
      moveCard(game, pick, ZONE.Hand, { inv: card(game, pick).owner ?? you });
      emit(game, EVENT.Returned, `${def(game, pick).name} returns to the hand`, {
        inv: you,
        card: pick,
      });
    },
  },
} satisfies CardScript;
