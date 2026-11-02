// Wendy's Amulet — play the topmost event of your discard pile; played events go to the bottom of your deck
import {
  card,
  def,
  emit,
  inv,
  moveCard,
  type CardScript,
  type EffCtx,
  type GameContext,
  type InstId,
  type InvId,
  EVENT,
  ZONE,
} from "../../../../src/engine/api";

export default {
  extraPlayable(game: GameContext, _cardId: InstId, i: InvId) {
    const top = inv(game, i).discard.at(-1);
    return top && def(game, top).type === "event" ? [top] : [];
  },
  hooks: {
    eventFinished(game: GameContext, ctx: EffCtx) {
      const ev = card(game, ctx.card!);
      moveCard(game, ev.id, ZONE.Deck, { inv: ev.owner });
      emit(
        game,
        EVENT.Amulet,
        `${def(game, ev.id).name} is placed on the bottom of the deck (Wendy's Amulet)`,
        { card: ev.id },
      );
    },
  },
} satisfies CardScript;
