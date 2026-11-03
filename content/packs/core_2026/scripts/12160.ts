// Raising Suspicions — 1 doom on the nearest enemy with no doom on it, or surge
import {
  distances,
  enemies,
  inv,
  push,
  type CardScript,
  type GameContext,
  STEP,
  type ScriptRun,
} from "../../../../src/engine/api";

export default {
  fns: {
    suspicion(game: GameContext, run: ScriptRun) {
      const from = inv(game, run.you).location;
      const pool = enemies(game).filter((e) => e.doom === 0 && e.location);
      if (!pool.length || !from) {
        push(game, { t: STEP.Eff, effect: { op: "surge" }, ctx: run.ctx });
        return;
      }
      const d = distances(game, from);
      const best = Math.min(...pool.map((e) => d.get(e.location!) ?? Infinity));
      const near = pool.filter((e) => (d.get(e.location!) ?? Infinity) === best);
      const pick = run.chooseCard(
        near.map((e) => e.id),
        { text: "Raising Suspicions: place 1 doom on", key: "chooseEnemy" },
      );
      push(game, { t: STEP.PlaceDoom, card: pick, n: 1 }, { t: STEP.CheckDoom });
    },
  },
} satisfies CardScript;
