// The Painted World — played as an exact copy of a non-exceptional event beneath Sefina Rousseau: that event's cost is
// paid and its effects resolve with The Painted World as their card, which is then removed from the game
import {
  abilitiesOf,
  addCounter,
  card,
  type CardScript,
  cardsBeneath,
  checkCondition,
  def,
  type EffCtx,
  type GameContext,
  inv,
  moveCard,
  playCost,
  queue,
  resolveEffects,
  runScript,
  type ScriptRun,
  ZONE,
} from "../../../../src/engine/api";

const CODE = "03012";

/** the events beneath the player's investigator it can copy now: one played by its own [action] text, affordable */
function copyable(game: GameContext, you: string, source: string): string[] {
  return cardsBeneath(game, inv(game, you).cardId).filter((id) => {
    const d = def(game, id);
    if (d.type !== "event" || d.keywords.includes("exceptional")) return false;
    // ponytail: a copy is played as The Painted World is, in an action window; fast and "play when …" events are left
    // out, add their windows if a deck needs them
    if (d.keywords.includes("fast")) return false;
    const a = abilitiesOf(game, id).find((x) => x.kind === "onPlay");
    if (!a) return false;
    if (a.condition && !checkCondition(game, a.condition, { source, you })) return false;
    return inv(game, you).resources >= playCost(game, you, id);
  });
}

export default {
  abilities: [{ kind: "onPlay", condition: { script: "canCopy" }, run: "copy" }],
  conditions: {
    canCopy: (game: GameContext, ctx: EffCtx) =>
      !!ctx.you && !!ctx.source && copyable(game, ctx.you, ctx.source).length > 0,
  },
  fns: {
    copy(game: GameContext, run: ScriptRun) {
      const ids = copyable(game, run.you, run.source);
      if (!ids.length) return;
      const pick = run.choose<string>(
        ids.map((id) => ({ id, label: def(game, id).name, card: id, value: id })),
        { text: "Choose an event beneath Sefina Rousseau to copy", key: "paintedWorld" },
      );
      addCounter(game, run.you, "resources", -playCost(game, run.you, pick));
      const a = abilitiesOf(game, pick).find((x) => x.kind === "onPlay")!;
      const ctx = { ...run.ctx, source: run.source, you: run.you };
      queue(
        game,
        a.run
          ? runScript({ code: card(game, pick).code, fn: a.run, ctx })
          : resolveEffects({ effects: a.effects ?? [], ctx }),
        runScript({ code: CODE, fn: "remove", ctx }),
      );
    },
    /** "Remove The Painted World from the game instead of discarding it" */
    remove(game: GameContext, run: ScriptRun) {
      if (card(game, run.source).zone === ZONE.Resolving) moveCard(game, run.source, ZONE.Removed);
    },
  },
} satisfies CardScript;
