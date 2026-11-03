// Aerial Pursuit — the nearest non-Elite enemy moves once toward you; if it engages someone, it attacks
import {
  attackKey,
  canEnemyEnter,
  cardIf,
  type CardScript,
  def,
  distances,
  emit,
  enemies,
  type GameContext,
  inv,
  invsAt,
  isElite,
  push,
  setCardLocation,
  setEngaged,
  stepsToward,
  EVENT,
  STEP,
  type ScriptRun,
  argField,
  asString,
} from "../../../../src/engine/api";

export default {
  fns: {
    pursuit(game: GameContext, run: ScriptRun) {
      const you = run.you;
      const to = inv(game, you).location;
      if (!to) return;
      const chosen = asString(argField(run.args, "enemy"));
      if (!chosen) {
        const pool = enemies(game).filter((e) => !isElite(game, e.id) && e.location);
        if (!pool.length) return;
        const d = distances(game, to);
        const best = Math.min(...pool.map((e) => d.get(e.location!) ?? Infinity));
        if (best === Infinity) return;
        const near = pool.filter((e) => (d.get(e.location!) ?? Infinity) === best);
        const pick = run.chooseCard(
          near.map((e) => e.id),
          { text: "Aerial Pursuit: which enemy moves?", key: "chooseEnemy" },
          { who: you },
        );
        push(game, {
          t: STEP.Script,
          code: "12163",
          fn: "pursuit",
          ctx: run.ctx,
          args: { enemy: pick },
        });
        return;
      }
      const e = cardIf(game, chosen);
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
