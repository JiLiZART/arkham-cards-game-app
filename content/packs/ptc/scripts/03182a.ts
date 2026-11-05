// Daniel Chesterfield (asset side) — [fast] Exhaust: give control of him to another investigator at your location.
// When you take horror, if at least 1 of it is not assigned to him: take 1 damage. If he leaves play he is removed
// from the game (its data: `leavesPlay`).
import {
  card,
  type CardScript,
  def,
  type EffCtx,
  emit,
  type GameContext,
  inv,
  invsAt,
  setController,
  EVENT,
  type ScriptRun,
} from "../../../../src/engine/api";

const others = (game: GameContext, ctx: EffCtx) =>
  ctx.you ? invsAt(game, inv(game, ctx.you).location).filter((i) => i !== ctx.you) : [];

export default {
  abilities: [
    {
      kind: "fast",
      label: "Daniel Chesterfield: give control of him to another investigator here",
      cost: { exhaust: true },
      condition: { script: "anotherHere" },
      run: "pass",
    },
    // "Forced - When you take horror, if at least 1 of that horror is not assigned to Daniel": the horrorTaken window
    // opens only when horror was placed on you
    { kind: "forced", trigger: "horrorTaken", effects: [{ op: "takeDamage", amount: 1 }] },
  ],
  conditions: {
    anotherHere: (game: GameContext, ctx: EffCtx) => others(game, ctx).length > 0,
  },
  fns: {
    pass(game: GameContext, run: ScriptRun) {
      const to = run.chooseInvestigator(others(game, { ...run.ctx, you: run.you }), {
        text: "Give control of Daniel Chesterfield to",
        key: "tuoPassDaniel",
      });
      setController(game, run.source, to);
      emit(
        game,
        EVENT.Control,
        `${inv(game, to).name} takes control of ${def(game, run.source).name}`,
        {
          inv: to,
          card: card(game, run.source).id,
        },
      );
    },
  },
} satisfies CardScript;
