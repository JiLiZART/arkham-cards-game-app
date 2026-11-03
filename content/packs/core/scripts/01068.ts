// Mind Wipe — a non-Elite enemy at your location has a blank text box until the end of the phase
import {
  addTempMod,
  def,
  emit,
  enemiesAt,
  inv,
  isElite,
  type CardScript,
  type GameContext,
  EVENT,
  type ScriptRun,
} from "../../../../src/engine/api";

export default {
  fns: {
    wipe(game: GameContext, run: ScriptRun) {
      const here = enemiesAt(game, inv(game, run.you).location).filter((e) => !isElite(game, e.id));
      if (!here.length) return;
      const pick = run.chooseCard(
        here.map((e) => e.id),
        { text: "Mind Wipe: choose an enemy", key: "chooseEnemy" },
      );
      addTempMod(game, { flag: "blankText" }, pick, "phase", run.ctx.source ?? null);
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
