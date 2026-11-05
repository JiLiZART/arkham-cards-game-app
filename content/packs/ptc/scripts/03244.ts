// The Path is Barred (The Pallid Mask, act 2): advances when The Man in the Pallid Mask is defeated, or by the clues
// the investigators in the Tomb of Shadows spend (`actSpendAt`). Back (Behind the Mask): defeated, two Conviction;
// clues, two Doubt (in the campaign log, the flow told by `log:hidden:tpmConvictionOrDoubt`); he leaves the game, and
// the act 3 of that path follows (the other is removed).
import {
  allCards,
  card,
  type CardScript,
  type EffCtx,
  emit,
  flags,
  type GameContext,
  moveCard,
  type ScriptRun,
  EVENT,
  ZONE,
  queue,
  advanceAct,
} from "../../../../src/engine/api";
import {
  LEADING_THE_WAY,
  MITPM,
  THE_WAY_OUT,
} from "../../../campaigns/the-path-to-carcosa/scripts/the-pallid-mask";

export default {
  abilities: [
    {
      kind: "forced",
      trigger: "enemyDefeated",
      condition: { script: "stranger" },
      run: "defeated",
    },
    { kind: "revelation", run: "behindTheMask" },
  ],
  conditions: {
    stranger: (game: GameContext, ctx: EffCtx) =>
      !!ctx.enemy && card(game, ctx.enemy).code === MITPM,
  },
  fns: {
    defeated(game: GameContext) {
      queue(game, advanceAct({ by: "objective" }));
    },
    behindTheMask(game: GameContext, run: ScriptRun) {
      const conviction = run.ctx.actAdvancedBy === "objective";
      const mark = conviction ? "conviction" : "doubt";
      const key = [mark, mark] as const;
      flags.countEntry.set(game, key, (flags.countEntry.get(game, key) ?? 0) + 2);
      flags.logEntry.set(game, ["hidden", "tpmConvictionOrDoubt"], true);
      emit(game, EVENT.Remember, `Mark two ${conviction ? "Conviction" : "Doubt"}`, {
        data: { mark },
      });
      for (const c of allCards(game).filter((x) => x.code === MITPM && x.zone !== ZONE.Removed))
        moveCard(game, c.id, ZONE.Removed);
      const other = conviction ? LEADING_THE_WAY : THE_WAY_OUT;
      for (const c of allCards(game).filter((x) => x.code === other && x.zone === ZONE.ActDeck))
        moveCard(game, c.id, ZONE.Removed);
    },
  },
} satisfies CardScript;
