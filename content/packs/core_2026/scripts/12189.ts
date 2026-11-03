// Dark Magician — when the round ends: 1 doom on the enemy with no doom nearest to it
import {
  cardIf,
  type CardScript,
  distances,
  enemies,
  type GameContext,
  leadInvestigator,
  push,
  STEP,
  type ScriptRun,
} from "../../../../src/engine/api";

export default {
  fns: {
    invoke(game: GameContext, run: ScriptRun) {
      const me = cardIf(game, run.source);
      if (me?.zone !== "enemy" || !me.location) return;
      const pool = enemies(game).filter((e) => e.doom === 0 && e.location);
      if (!pool.length) return;
      const d = distances(game, me.location);
      const best = Math.min(...pool.map((e) => d.get(e.location!) ?? Infinity));
      const near = pool.filter((e) => (d.get(e.location!) ?? Infinity) === best);
      const pick = run.chooseCard(
        near.map((e) => e.id),
        { text: "Dark Magician: place 1 doom on", key: "chooseEnemy" },
        { who: leadInvestigator(game) },
      );
      push(game, { t: STEP.PlaceDoom, card: pick, n: 1 }, { t: STEP.CheckDoom });
    },
  },
} satisfies CardScript;
