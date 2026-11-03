// Daniela's Wrench — an enemy at your location engages you and makes an immediate attack
import {
  attackKey,
  type CardScript,
  def,
  emit,
  enemiesAt,
  type GameContext,
  inv,
  invName,
  push,
  setEngaged,
  EVENT,
  STEP,
  type ScriptRun,
} from "../../../../src/engine/api";

export default {
  fns: {
    provoke(game: GameContext, run: ScriptRun) {
      const you = run.you;
      const here = enemiesAt(game, inv(game, you).location);
      if (!here.length) return;
      const pick = run.chooseCard(
        here.map((e) => e.id),
        { text: "Daniela's Wrench: choose an enemy", key: "chooseEnemy" },
        { who: you },
      );
      setEngaged(game, pick, you);
      emit(game, EVENT.Engage, `${def(game, pick).name} engages ${invName(game, you)}`, {
        inv: you,
        card: pick,
      });
      push(game, { t: STEP.EnemyAttack, enemy: pick, inv: you, aoo: false, key: attackKey(game) });
    },
  },
} satisfies CardScript;
