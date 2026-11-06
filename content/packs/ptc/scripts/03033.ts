// Uncage the Soul — a [[Spell]] or [[Ritual]] card from your hand is played, costing 3 less
import {
  abilitiesOf,
  addCounter,
  type CardScript,
  checkCondition,
  def,
  type EffCtx,
  type GameContext,
  inv,
  playCard,
  playCost,
  queue,
  type ScriptRun,
  uniqueInPlay,
} from "../../../../src/engine/api";

/** the Spell and Ritual assets and events in your hand you can afford at 3 less, and play now */
function playable(game: GameContext, you: string, self: string): string[] {
  return inv(game, you).hand.filter((h) => {
    const d = def(game, h);
    if (h === self || !d.traits.some((t) => t === "Spell" || t === "Ritual")) return false;
    if (inv(game, you).resources < Math.max(0, playCost(game, you, h) - 3)) return false;
    if (d.type === "asset") return !uniqueInPlay(game, h);
    if (d.type !== "event") return false;
    // ponytail: an event is played as Uncage the Soul is, by its own text; "play when …" events are left out
    const a = abilitiesOf(game, h).find((x) => x.kind === "onPlay");
    return !!a && (!a.condition || checkCondition(game, a.condition, { source: h, you }));
  });
}

export default {
  abilities: [{ kind: "onPlay", condition: { script: "hasSpell" }, run: "uncage" }],
  conditions: {
    hasSpell: (game: GameContext, ctx: EffCtx) =>
      !!ctx.you && !!ctx.source && playable(game, ctx.you, ctx.source).length > 0,
  },
  fns: {
    uncage(game: GameContext, run: ScriptRun) {
      const ids = playable(game, run.you, run.source);
      if (!ids.length) return;
      const pick = run.choose<string>(
        ids.map((id) => ({ id, label: def(game, id).name, card: id, value: id })),
        { text: "Choose a Spell or Ritual card to play (3 less)", key: "uncageTheSoul" },
      );
      // the reduced cost is paid here; the card itself is then played for free
      addCounter(game, run.you, "resources", -Math.max(0, playCost(game, run.you, pick) - 3));
      queue(game, playCard({ inv: run.you, card: pick, free: true }));
    },
  },
} satisfies CardScript;
