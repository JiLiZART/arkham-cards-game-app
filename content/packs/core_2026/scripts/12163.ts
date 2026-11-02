// Aerial Pursuit — the nearest non-Elite enemy moves once toward you; if it engages someone, it attacks
import {
  ask,
  attackKey,
  canEnemyEnter,
  cardIf,
  type CardScript,
  def,
  distances,
  type EffCtx,
  emit,
  enemies,
  type GameContext,
  type InstId,
  inv,
  invsAt,
  isElite,
  push,
  setCardLocation,
  setEngaged,
  type Step,
  stepsToward,
  EVENT,
  CHOICE,
  STEP,
} from "../../../../src/engine/api";

export default {
  fns: {
    pursuit(game: GameContext, ctx: EffCtx, args: { enemy?: InstId } | undefined, step?: Step) {
      const you = ctx.you!;
      const to = inv(game, you).location;
      if (!to) return;
      if (!args?.enemy) {
        const pool = enemies(game).filter((e) => !isElite(game, e.id) && e.location);
        if (!pool.length) return;
        const d = distances(game, to);
        const best = Math.min(...pool.map((e) => d.get(e.location!) ?? Infinity));
        if (best === Infinity) return;
        const near = pool.filter((e) => (d.get(e.location!) ?? Infinity) === best);
        const pick = ask<InstId>(
          game,
          step!,
          you,
          CHOICE.Target,
          "Aerial Pursuit: which enemy moves?",
          near.map((e) => ({ id: e.id, label: def(game, e.id).name, card: e.id, value: e.id })),
          { auto: true, key: "chooseEnemy" },
        );
        if (pick === undefined) return;
        push(game, { t: STEP.Script, code: "12163", fn: "pursuit", ctx, args: { enemy: pick } });
        return;
      }
      const e = cardIf(game, args.enemy);
      if (e?.zone !== "enemy" || !e.location) return;
      if (e.location !== to) {
        const next = stepsToward(game, e.location, [to]).filter((l) =>
          canEnemyEnter(game, e.id, l),
        )[0];
        if (!next) return;
        setCardLocation(game, e.id, next);
        setEngaged(game, e.id, null);
        emit(game, EVENT.EnemyMove, `${def(game, e.id).name} moves to ${def(game, next).name}`, {
          card: e.id,
          data: { to: next },
        });
      }
      const here = invsAt(game, e.location);
      if (e.engagedWith || !here.length || def(game, e.id).keywords.includes("aloof")) return;
      const target = here.includes(you) ? you : here[0];
      setEngaged(game, e.id, target);
      emit(game, EVENT.Engage, `${def(game, e.id).name} engages ${inv(game, target).name}`, {
        inv: target,
        card: e.id,
      });
      push(game, {
        t: STEP.EnemyAttack,
        enemy: e.id,
        inv: target,
        aoo: false,
        key: attackKey(game),
      });
    },
  },
} satisfies CardScript;
