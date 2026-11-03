// Unbridled Knowledge — reveal the top 5 cards (8 with 2+ clues), draw 3 of them, put each other one on the top or bottom
import {
  cardIf,
  type CardScript,
  def,
  emit,
  type GameContext,
  type InstId,
  inv,
  moveCard,
  push,
  putOnTop,
  EVENT,
  ZONE,
  CHOICE,
  STEP,
  type ScriptRun,
  argField,
  asNumber,
  asStrings,
} from "../../../../src/engine/api";

type Args = { cards: InstId[]; drawn: number };

export default {
  abilities: [{ kind: "onPlay", run: "reveal" }],
  fns: {
    reveal(game: GameContext, run: ScriptRun) {
      const me = inv(game, run.you);
      const cards = me.deck.slice(0, me.clues >= 2 ? 8 : 5);
      emit(game, EVENT.Look, `${me.name} reveals the top ${cards.length} cards of their deck`, {
        inv: run.you,
        data: { n: cards.length },
      });
      push(game, {
        t: STEP.Script,
        code: "12043",
        fn: "take",
        ctx: run.ctx,
        args: { cards, drawn: 0 },
      });
    },
    take(game: GameContext, run: ScriptRun) {
      const you = run.you;
      const args: Args = {
        cards: asStrings(argField(run.args, "cards")),
        drawn: asNumber(argField(run.args, "drawn")) ?? 0,
      };
      const left = args.cards.filter((id) => cardIf(game, id)?.zone === "deck");
      if (args.drawn < 3 && left.length) {
        const pick = run.choose<InstId>(
          left.map((id) => ({ id, label: def(game, id).name, card: id, value: id })),
          {
            text: `Unbridled Knowledge: draw a card (${3 - args.drawn} left)`,
            key: "searchTop",
            vars: { n: args.cards.length },
          },
          { kind: CHOICE.Generic, who: you },
        );
        putOnTop(game, you, [pick]);
        push(
          game,
          { t: STEP.Draw, inv: you, n: 1, tapped: true },
          {
            t: STEP.Script,
            code: "12043",
            fn: "take",
            ctx: run.ctx,
            args: { ...args, drawn: args.drawn + 1 },
          },
        );
        return;
      }
      if (!left.length) return;
      // the rest, one at a time: on the top or the bottom of the deck
      const id = left[0];
      const where = run.choose<"top" | "bottom">(
        [
          { id: "top", label: "Top", value: "top", card: id },
          { id: "bottom", label: "Bottom", value: "bottom", card: id },
        ],
        {
          text: `Unbridled Knowledge: put ${def(game, id).name} on the top or the bottom of your deck`,
          key: "chooseOne",
        },
        { auto: false, kind: CHOICE.Generic, who: you },
      );
      moveCard(game, id, ZONE.Limbo);
      moveCard(game, id, ZONE.Deck, { inv: you, top: where === "top" });
      push(game, {
        t: STEP.Script,
        code: "12043",
        fn: "take",
        ctx: run.ctx,
        args: { cards: left.slice(1), drawn: 3 },
      });
    },
  },
} satisfies CardScript;
