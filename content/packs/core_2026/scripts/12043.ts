// Unbridled Knowledge — reveal the top 5 cards (8 with 2+ clues), draw 3 of them, put each other one on the top or bottom
import {
  ask,
  def,
  emit,
  inv,
  moveCard,
  push,
  type CardScript,
  type EffCtx,
  type G,
  type InstId,
  type Step,
} from "../../../../src/engine/api";

type Args = { cards: InstId[]; drawn: number };

export default {
  abilities: [{ kind: "onPlay", run: "reveal" }],
  fns: {
    reveal(g: G, ctx: EffCtx) {
      const me = inv(g, ctx.you!);
      const cards = me.deck.slice(0, me.clues >= 2 ? 8 : 5);
      emit(g, "look", `${me.name} reveals the top ${cards.length} cards of their deck`, {
        inv: ctx.you!,
        data: { n: cards.length },
      });
      push(g, { t: "Script", code: "12043", fn: "take", ctx, args: { cards, drawn: 0 } });
    },
    take(g: G, ctx: EffCtx, args: Args, step?: Step) {
      const you = ctx.you!;
      const left = args.cards.filter((id) => g.s.cards[id]?.zone === "deck");
      if (args.drawn < 3 && left.length) {
        const pick = ask<InstId>(
          g,
          step!,
          you,
          "generic",
          `Unbridled Knowledge: draw a card (${3 - args.drawn} left)`,
          left.map((id) => ({ id, label: def(g, id).name, card: id, value: id })),
          { auto: true, key: "searchTop", vars: { n: args.cards.length } },
        );
        if (pick === undefined) return;
        const deck = inv(g, you).deck;
        deck.splice(deck.indexOf(pick), 1);
        deck.unshift(pick);
        push(
          g,
          { t: "Draw", inv: you, n: 1, tapped: true },
          { t: "Script", code: "12043", fn: "take", ctx, args: { ...args, drawn: args.drawn + 1 } },
        );
        return;
      }
      if (!left.length) return;
      // the rest, one at a time: on the top or the bottom of the deck
      const id = left[0];
      const where = ask<"top" | "bottom">(
        g,
        step!,
        you,
        "generic",
        `Unbridled Knowledge: put ${def(g, id).name} on the top or the bottom of your deck`,
        [
          { id: "top", label: "Top", value: "top", card: id },
          { id: "bottom", label: "Bottom", value: "bottom", card: id },
        ],
        { key: "chooseOne" },
      );
      if (where === undefined) return;
      moveCard(g, id, "limbo");
      moveCard(g, id, "deck", { inv: you, top: where === "top" });
      push(g, {
        t: "Script",
        code: "12043",
        fn: "take",
        ctx,
        args: { cards: left.slice(1), drawn: 3 },
      });
    },
  },
} satisfies CardScript;
