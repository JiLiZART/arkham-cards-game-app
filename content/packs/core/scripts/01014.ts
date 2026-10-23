// Wendy's Amulet — play the topmost event of your discard pile; played events go to the bottom of your deck
import {
  card,
  def,
  emit,
  inv,
  moveCard,
  type CardScript,
  type EffCtx,
  type G,
  type InstId,
  type InvId,
} from "../../../../src/engine/api";

export default {
  extraPlayable(g: G, _cardId: InstId, i: InvId) {
    const top = inv(g, i).discard.at(-1);
    return top && def(g, top).type === "event" ? [top] : [];
  },
  hooks: {
    eventFinished(g: G, ctx: EffCtx) {
      const ev = card(g, ctx.card!);
      moveCard(g, ev.id, "deck", { inv: ev.owner });
      emit(
        g,
        "amulet",
        `${def(g, ev.id).name} is placed on the bottom of the deck (Wendy's Amulet)`,
        { card: ev.id },
      );
    },
  },
} satisfies CardScript;
