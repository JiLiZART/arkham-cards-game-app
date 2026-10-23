// Aerial Pursuit — the nearest non-Elite enemy moves once toward you; if it engages someone, it attacks
import {
  ask,
  def,
  distances,
  emit,
  enemies,
  inv,
  invsAt,
  isElite,
  push,
  stepsToward,
  canEnemyEnter,
  type CardScript,
  type EffCtx,
  type G,
  type InstId,
  type Step,
} from "../../../../src/engine/api";

export default {
  fns: {
    pursuit(g: G, ctx: EffCtx, args: { enemy?: InstId } | undefined, step?: Step) {
      const you = ctx.you!;
      const to = inv(g, you).location;
      if (!to) return;
      if (!args?.enemy) {
        const pool = enemies(g).filter((e) => !isElite(g, e.id) && e.location);
        if (!pool.length) return;
        const d = distances(g, to);
        const best = Math.min(...pool.map((e) => d.get(e.location!) ?? Infinity));
        if (best === Infinity) return;
        const near = pool.filter((e) => (d.get(e.location!) ?? Infinity) === best);
        const pick = ask<InstId>(
          g,
          step!,
          you,
          "target",
          "Aerial Pursuit: which enemy moves?",
          near.map((e) => ({ id: e.id, label: def(g, e.id).name, card: e.id, value: e.id })),
          { auto: true, key: "chooseEnemy" },
        );
        if (pick === undefined) return;
        push(g, { t: "Script", code: "12163", fn: "pursuit", ctx, args: { enemy: pick } });
        return;
      }
      const e = g.s.cards[args.enemy];
      if (e?.zone !== "enemy" || !e.location) return;
      if (e.location !== to) {
        const next = stepsToward(g, e.location, [to]).filter((l) => canEnemyEnter(g, e.id, l))[0];
        if (!next) return;
        e.location = next;
        e.engagedWith = null;
        emit(g, "enemyMove", `${def(g, e.id).name} moves to ${def(g, next).name}`, {
          card: e.id,
          data: { to: next },
        });
      }
      const here = invsAt(g, e.location);
      if (e.engagedWith || !here.length || def(g, e.id).keywords.includes("aloof")) return;
      const target = here.includes(you) ? you : here[0];
      e.engagedWith = target;
      emit(g, "engage", `${def(g, e.id).name} engages ${inv(g, target).name}`, {
        inv: target,
        card: e.id,
      });
      push(g, { t: "EnemyAttack", enemy: e.id, inv: target, aoo: false, key: `atk${g.s.seq++}` });
    },
  },
} satisfies CardScript;
