// A Chance Encounter (2) — an [[Ally]] asset from any player's discard pile into play under your control, its printed
// cost paid as X (cards.json: costX "script")
import {
  activeInvs,
  addCounter,
  type CardScript,
  checkSlots,
  def,
  type EffCtx,
  enterPlay,
  type GameContext,
  type InstId,
  inv,
  queue,
  type ScriptRun,
} from "../../../../src/engine/api";

const costOf = (game: GameContext, id: InstId) => {
  const cost = def(game, id).cost;
  return typeof cost === "number" ? cost : null;
};

/** the Allies in discard piles whose printed cost `you` can pay */
const allies = (game: GameContext, you: string): InstId[] =>
  activeInvs(game).flatMap((i) =>
    inv(game, i).discard.filter((c) => {
      const cost = costOf(game, c);
      return (
        def(game, c).type === "asset" &&
        def(game, c).traits.includes("Ally") &&
        cost !== null &&
        cost <= inv(game, you).resources
      );
    }),
  );

export default {
  abilities: [{ kind: "onPlay", condition: { script: "affordableAlly" }, run: "encounter" }],
  conditions: {
    affordableAlly: (game: GameContext, ctx: EffCtx) =>
      !!ctx.you && allies(game, ctx.you).length > 0,
  },
  fns: {
    encounter(game: GameContext, run: ScriptRun) {
      const pool = allies(game, run.you);
      if (!pool.length) return;
      const pick = run.chooseCard(pool, {
        text: "A Chance Encounter: choose an Ally asset to put into play",
        key: "chooseAllyFromDiscard",
      });
      addCounter(game, run.you, "resources", -(costOf(game, pick) ?? 0));
      queue(
        game,
        checkSlots({ inv: run.you, card: pick }),
        enterPlay({ inv: run.you, card: pick }),
      );
    },
  },
} satisfies CardScript;
