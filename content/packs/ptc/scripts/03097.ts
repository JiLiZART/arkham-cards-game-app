// Dance of the Yellow King — with no [[Possessed]] enemy in play it gains surge; otherwise test [willpower] (3): a
// failure readies the nearest Possessed enemy, which comes to your location, engages you and attacks at once.
import {
  attackKey,
  type CardScript,
  def,
  distances,
  emit,
  enemies,
  flags,
  type GameContext,
  inv,
  ready,
  setCardLocation,
  setEngaged,
  EVENT,
  type ScriptRun,
  queue,
  enemyAttacks,
  resolveEffect,
} from "../../../../src/engine/api";

const possessed = (game: GameContext) =>
  enemies(game).filter((e) => def(game, e.id).traits.includes("Possessed"));

export default {
  abilities: [{ kind: "revelation", run: "dance" }],
  fns: {
    dance(game: GameContext, run: ScriptRun) {
      if (!possessed(game).length) {
        flags.surge.set(game, run.source, true);
        return;
      }
      queue(
        game,
        resolveEffect({
          effect: {
            op: "skillTest",
            skill: "willpower",
            difficulty: 3,
            onFail: [{ op: "script", fn: "summon" }],
          },
          ctx: run.ctx,
        }),
      );
    },
    summon(game: GameContext, run: ScriptRun) {
      const here = inv(game, run.you).location;
      if (!here) return;
      const far = distances(game, here);
      const dist = (loc: string | null) => (loc ? (far.get(loc) ?? Infinity) : Infinity);
      const near = possessed(game).sort((a, b) => dist(a.location) - dist(b.location))[0];
      if (!near) return;
      ready(game, near.id);
      setCardLocation(game, near.id, here);
      setEngaged(game, near.id, run.you);
      emit(game, EVENT.EnemyMove, `${def(game, near.id).name} comes to ${def(game, here).name}`, {
        card: near.id,
        data: { to: here },
      });
      queue(game, enemyAttacks({ enemy: near.id, inv: run.you, aoo: false, key: attackKey(game) }));
    },
  },
} satisfies CardScript;
