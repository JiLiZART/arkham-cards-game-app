// Mind Wipe — a non-Elite enemy at your location has a blank text box until the end of the phase
import {
  addTempMod,
  ask,
  def,
  emit,
  enemiesAt,
  inv,
  isElite,
  type CardScript,
  type EffCtx,
  type GameContext,
  type InstId,
  type Step,
  EVENT,
  CHOICE,
} from "../../../../src/engine/api";

export default {
  fns: {
    wipe(game: GameContext, ctx: EffCtx, _args: unknown, step?: Step) {
      const here = enemiesAt(game, inv(game, ctx.you!).location).filter(
        (e) => !isElite(game, e.id),
      );
      if (!here.length) return;
      const pick = ask<InstId>(
        game,
        step!,
        ctx.you!,
        CHOICE.Target,
        "Mind Wipe: choose an enemy",
        here.map((e) => ({ id: e.id, label: def(game, e.id).name, card: e.id, value: e.id })),
        { auto: true, key: "chooseEnemy" },
      );
      if (pick === undefined) return;
      addTempMod(game, { flag: "blankText" }, pick, "phase", ctx.source ?? null);
      emit(
        game,
        EVENT.Blank,
        `${def(game, pick).name}'s text box is blank until the end of the phase`,
        {
          card: pick,
        },
      );
    },
  },
} satisfies CardScript;
