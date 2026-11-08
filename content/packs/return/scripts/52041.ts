// Montparnasse (Return to A Phantom of Truth) — Forced: after you discover clues from it, discard cards from your hand
// with as many [willpower] icons among them as clues discovered (one card at a time, you choose); if your hand can't
// make up that many, take 1 horror instead.
import {
  argField,
  asNumber,
  type CardScript,
  def,
  discard,
  type GameContext,
  type InstId,
  inv,
  queue,
  resolveEffect,
  runScript,
  type ScriptRun,
} from "../../../../src/engine/api";

const CODE = "52041";
const icons = (game: GameContext, id: InstId) => def(game, id).icons?.willpower ?? 0;
const withIcons = (game: GameContext, who: string) =>
  inv(game, who).hand.filter((id) => icons(game, id) > 0);

export default {
  abilities: [{ kind: "forced", trigger: "cluesDiscovered", run: "discovered" }],
  fns: {
    discovered(game: GameContext, run: ScriptRun) {
      const you = run.ctx.inv;
      const n = run.ctx.x ?? 0;
      if (!you || n <= 0) return;
      const ctx = { ...run.ctx, you };
      const total = withIcons(game, you).reduce((s, id) => s + icons(game, id), 0);
      queue(
        game,
        total >= n
          ? runScript({ code: CODE, fn: "discardIcons", ctx, args: { left: n } })
          : resolveEffect({ effect: { op: "takeHorror", amount: 1 }, ctx }),
      );
    },
    /** one card with [willpower] icons discarded, then another while fewer than needed are discarded */
    discardIcons(game: GameContext, run: ScriptRun) {
      const left = asNumber(argField(run.args, "left")) ?? 0;
      const cards = withIcons(game, run.you);
      if (left <= 0 || !cards.length) return;
      const id = run.chooseCard(cards, {
        text: `Choose a card to discard (${left} willpower icon(s) to go)`,
        key: "passengerDiscard.willpower",
        vars: { n: left },
      });
      discard(game, id);
      const rest = left - icons(game, id);
      if (rest > 0)
        queue(
          game,
          runScript({ code: CODE, fn: "discardIcons", ctx: run.ctx, args: { left: rest } }),
        );
    },
  },
} satisfies CardScript;
