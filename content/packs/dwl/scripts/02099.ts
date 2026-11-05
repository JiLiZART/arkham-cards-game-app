// Hunted Down — each unengaged Criminal enemy moves 1 location toward you; each that engages you attacks; with none,
// it surges
import {
  canEnemyEnter,
  type CardScript,
  def,
  emit,
  enemies,
  flags,
  type GameContext,
  inv,
  isAloof,
  setCardLocation,
  setEngaged,
  stepsToward,
  EVENT,
  type ScriptRun,
  type InstId,
  type Queued,
  queue,
  attackKey,
  enemyAttacks,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "hunt" }],
  fns: {
    hunt(game: GameContext, run: ScriptRun) {
      const criminals = enemies(game).filter(
        (e) => !e.engagedWith && def(game, e.id).traits.includes("Criminal"),
      );
      if (!criminals.length) {
        flags.surge.set(game, run.source, true);
        return;
      }
      const here = inv(game, run.you).location;
      if (!here) return;
      const attacks: Queued[] = [];
      for (const e of criminals) {
        if (!e.location || e.location === here) continue;
        const to: InstId | undefined = stepsToward(game, e.location, [here]).find((l) =>
          canEnemyEnter(game, e.id, l),
        );
        if (!to) continue;
        const from = e.location;
        setCardLocation(game, e.id, to);
        emit(game, EVENT.EnemyMove, `${def(game, e.id).name} hunts you down`, {
          card: e.id,
          data: { from, to },
        });
        // one that arrives where you are engages you, if it can, and attacks
        // an aloof one (The Clover Club makes each Criminal aloof) does not engage
        if (to !== here || e.exhausted || isAloof(game, e.id)) continue;
        setEngaged(game, e.id, run.you);
        emit(game, EVENT.Engage, `${def(game, e.id).name} engages you`, {
          inv: run.you,
          card: e.id,
        });
        attacks.push(enemyAttacks({ enemy: e.id, inv: run.you, aoo: false, key: attackKey(game) }));
      }
      queue(game, ...attacks);
    },
  },
} satisfies CardScript;
