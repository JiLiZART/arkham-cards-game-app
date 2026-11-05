// Eldritch Accord — Revelation: you may draw 1 card, then discard up to 2 cards from your hand (one a step), then test
// willpower against the cards left in your hand: a failure is 2 horror
import {
  asNumber,
  type CardScript,
  def,
  discard,
  drawCards,
  type GameContext,
  inv,
  queue,
  resolveEffect,
  runScript,
  type ScriptRun,
} from "../../../../src/engine/api";

const next = (run: ScriptRun, left: number) =>
  runScript({ code: "51072", fn: "discardUpTo", ctx: run.ctx, args: left });

export default {
  abilities: [{ kind: "revelation", run: "accord" }],
  fns: {
    accord(game: GameContext, run: ScriptRun) {
      const draw = run.choose<boolean>(
        [
          { id: "yes", label: "Draw 1 card", value: true, key: "option.draw1" },
          { id: "no", label: "No", value: false, key: "option.no" },
        ],
        { text: "Eldritch Accord: draw 1 card?", key: "eldritchAccordDraw" },
        { auto: false },
      );
      queue(game, ...(draw ? [drawCards({ inv: run.you, n: 1 })] : []), next(run, 2));
    },
    discardUpTo(game: GameContext, run: ScriptRun) {
      const left = asNumber(run.args) ?? 0;
      const hand = inv(game, run.you).hand;
      const pick =
        left > 0 && hand.length
          ? run.choose<string | null>(
              [
                ...hand.map((id) => ({ id, label: def(game, id).name, value: id, card: id })),
                { id: "done", label: "Done", value: null, key: "option.done" },
              ],
              {
                text: `Eldritch Accord: discard up to ${left} card(s)`,
                key: "eldritchAccordDiscard",
              },
              { auto: false },
            )
          : null;
      if (pick) {
        discard(game, pick);
        queue(game, next(run, left - 1));
        return;
      }
      // X is the cards in hand as the test begins: the next step
      queue(
        game,
        resolveEffect({
          effect: {
            op: "skillTest",
            skill: "willpower",
            difficulty: inv(game, run.you).hand.length,
            onFail: [{ op: "takeHorror", amount: 2 }],
          },
          ctx: run.ctx,
        }),
      );
    },
  },
} satisfies CardScript;
