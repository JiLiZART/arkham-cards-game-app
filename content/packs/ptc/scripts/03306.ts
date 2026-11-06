// Eidetic Memory — played as an exact copy of an [[Insight]] event in any discard pile, its cost included: that event
// leaves the game, Eidetic Memory takes its title and is played as it, then leaves the game instead of being discarded
// (played as an action: the copy of a fast event is not offered in other windows)
import {
  abilitiesOf,
  activeInvs,
  card,
  type CardScript,
  checkCondition,
  def,
  type EffCtx,
  emit,
  EVENT,
  type GameContext,
  type InstId,
  inv,
  invName,
  moveCard,
  playCard,
  queue,
  runScript,
  type ScriptRun,
  setCode,
  ZONE,
} from "../../../../src/engine/api";

const EIDETIC = "03306";

/** the Insight events in discard piles that `you` could play now, paying their cost */
function insights(game: GameContext, you: string): InstId[] {
  return activeInvs(game)
    .flatMap((i) => inv(game, i).discard)
    .filter((id) => {
      const d = def(game, id);
      const play = abilitiesOf(game, id).find((a) => a.kind === "onPlay");
      return (
        d.type === "event" &&
        d.traits.includes("Insight") &&
        typeof d.cost === "number" &&
        d.cost <= inv(game, you).resources &&
        (!play?.condition || checkCondition(game, play.condition, { source: id, you }))
      );
    });
}

export default {
  abilities: [{ kind: "onPlay", condition: { script: "insight" }, run: "copy" }],
  conditions: {
    insight: (game: GameContext, ctx: EffCtx) => !!ctx.you && insights(game, ctx.you).length > 0,
  },
  fns: {
    copy(game: GameContext, run: ScriptRun) {
      const pool = insights(game, run.you);
      if (!pool.length) return;
      const pick = run.chooseCard(pool, {
        text: "Eidetic Memory: choose an Insight event to play as a copy",
        key: "eideticMemory",
      });
      const code = card(game, pick).code;
      moveCard(game, pick, ZONE.Removed);
      emit(
        game,
        EVENT.Remove,
        `${invName(game, run.you)} plays Eidetic Memory as ${def(game, pick).name}`,
        { inv: run.you, card: pick },
      );
      setCode(game, run.source, code);
      queue(
        game,
        playCard({ inv: run.you, card: run.source }),
        runScript({ code: EIDETIC, fn: "remove", ctx: run.ctx }),
      );
    },
    /** discarded once the copy resolved: out of the game instead, as itself again */
    remove(game: GameContext, run: ScriptRun) {
      if (card(game, run.source).zone !== ZONE.Discard) return;
      setCode(game, run.source, EIDETIC);
      moveCard(game, run.source, ZONE.Removed);
    },
  },
} satisfies CardScript;
