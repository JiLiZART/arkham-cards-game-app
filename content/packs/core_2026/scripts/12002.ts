// Daniela's Wrench — an enemy at your location engages you and makes an immediate attack
import {
  ask,
  def,
  emit,
  enemiesAt,
  inv,
  invName,
  push,
  type CardScript,
  type EffCtx,
  type G,
  type InstId,
  type Step,
} from "../../../../src/engine/api";

export default {
  fns: {
    provoke(g: G, ctx: EffCtx, _args: unknown, step?: Step) {
      const you = ctx.you!;
      const here = enemiesAt(g, inv(g, you).location);
      if (!here.length) return;
      const pick = ask<InstId>(
        g,
        step!,
        you,
        "target",
        "Daniela's Wrench: choose an enemy",
        here.map((e) => ({ id: e.id, label: def(g, e.id).name, card: e.id, value: e.id })),
        { auto: true, key: "chooseEnemy" },
      );
      if (pick === undefined) return;
      g.s.cards[pick].engagedWith = you;
      emit(g, "engage", `${def(g, pick).name} engages ${invName(g, you)}`, {
        inv: you,
        card: pick,
      });
      push(g, { t: "EnemyAttack", enemy: pick, inv: you, aoo: false, key: `atk${g.s.seq++}` });
    },
  },
} satisfies CardScript;
