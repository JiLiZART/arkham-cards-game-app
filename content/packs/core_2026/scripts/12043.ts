// Unbridled Knowledge — reveal the top 5 cards (8 with 2+ clues), draw 3 of them, put each other one on the top or bottom
import {
  ask,
  cardIf,
  type CardScript,
  def,
  type EffCtx,
  emit,
  type GameContext,
  type InstId,
  inv,
  moveCard,
  push,
  putOnTop,
  type Step,
  EVENT,
  ZONE,
  CHOICE,
  STEP,
} from "../../../../src/engine/api";

type Args = { cards: InstId[]; drawn: number };

export default {
  abilities: [{ kind: "onPlay", run: "reveal" }],
  fns: {
    reveal(game: GameContext, ctx: EffCtx) {
      const me = inv(game, ctx.you!);
      const cards = me.deck.slice(0, me.clues >= 2 ? 8 : 5);
      emit(game, EVENT.Look, `${me.name} reveals the top ${cards.length} cards of their deck`, {
        inv: ctx.you!,
        data: { n: cards.length },
      });
      push(game, { t: STEP.Script, code: "12043", fn: "take", ctx, args: { cards, drawn: 0 } });
    },
    take(game: GameContext, ctx: EffCtx, args: Args, step?: Step) {
      const you = ctx.you!;
      const left = args.cards.filter((id) => cardIf(game, id)?.zone === "deck");
      if (args.drawn < 3 && left.length) {
        const pick = ask<InstId>(
          game,
          step!,
          you,
          CHOICE.Generic,
          `Unbridled Knowledge: draw a card (${3 - args.drawn} left)`,
          left.map((id) => ({ id, label: def(game, id).name, card: id, value: id })),
          { auto: true, key: "searchTop", vars: { n: args.cards.length } },
        );
        if (pick === undefined) return;
        putOnTop(game, you, [pick]);
        push(
          game,
          { t: STEP.Draw, inv: you, n: 1, tapped: true },
          {
            t: STEP.Script,
            code: "12043",
            fn: "take",
            ctx,
            args: { ...args, drawn: args.drawn + 1 },
          },
        );
        return;
      }
      if (!left.length) return;
      // the rest, one at a time: on the top or the bottom of the deck
      const id = left[0];
      const where = ask<"top" | "bottom">(
        game,
        step!,
        you,
        CHOICE.Generic,
        `Unbridled Knowledge: put ${def(game, id).name} on the top or the bottom of your deck`,
        [
          { id: "top", label: "Top", value: "top", card: id },
          { id: "bottom", label: "Bottom", value: "bottom", card: id },
        ],
        { key: "chooseOne" },
      );
      if (where === undefined) return;
      moveCard(game, id, ZONE.Limbo);
      moveCard(game, id, ZONE.Deck, { inv: you, top: where === "top" });
      push(game, {
        t: STEP.Script,
        code: "12043",
        fn: "take",
        ctx,
        args: { cards: left.slice(1), drawn: 3 },
      });
    },
  },
} satisfies CardScript;
