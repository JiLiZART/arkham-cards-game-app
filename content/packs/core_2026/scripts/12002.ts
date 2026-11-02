// Daniela's Wrench — an enemy at your location engages you and makes an immediate attack
import {
  ask,
  attackKey,
  type CardScript,
  def,
  type EffCtx,
  emit,
  enemiesAt,
  type GameContext,
  type InstId,
  inv,
  invName,
  push,
  setEngaged,
  type Step,
  EVENT,
  CHOICE,
  STEP,
} from "../../../../src/engine/api";

export default {
  fns: {
    provoke(game: GameContext, ctx: EffCtx, _args: unknown, step?: Step) {
      const you = ctx.you!;
      const here = enemiesAt(game, inv(game, you).location);
      if (!here.length) return;
      const pick = ask<InstId>(
        game,
        step!,
        you,
        CHOICE.Target,
        "Daniela's Wrench: choose an enemy",
        here.map((e) => ({ id: e.id, label: def(game, e.id).name, card: e.id, value: e.id })),
        { auto: true, key: "chooseEnemy" },
      );
      if (pick === undefined) return;
      setEngaged(game, pick, you);
      emit(game, EVENT.Engage, `${def(game, pick).name} engages ${invName(game, you)}`, {
        inv: you,
        card: pick,
      });
      push(game, { t: STEP.EnemyAttack, enemy: pick, inv: you, aoo: false, key: attackKey(game) });
    },
  },
} satisfies CardScript;
