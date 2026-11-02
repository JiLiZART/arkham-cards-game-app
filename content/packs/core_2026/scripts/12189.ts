// Dark Magician — when the round ends: 1 doom on the enemy with no doom nearest to it
import {
  ask,
  cardIf,
  type CardScript,
  def,
  distances,
  type EffCtx,
  enemies,
  type GameContext,
  type InstId,
  leadInvestigator,
  push,
  type Step,
  CHOICE,
  STEP,
} from "../../../../src/engine/api";

export default {
  fns: {
    invoke(game: GameContext, ctx: EffCtx, _args: unknown, step?: Step) {
      const me = cardIf(game, ctx.source!);
      if (me?.zone !== "enemy" || !me.location) return;
      const pool = enemies(game).filter((e) => e.doom === 0 && e.location);
      if (!pool.length) return;
      const d = distances(game, me.location);
      const best = Math.min(...pool.map((e) => d.get(e.location!) ?? Infinity));
      const near = pool.filter((e) => (d.get(e.location!) ?? Infinity) === best);
      const pick = ask<InstId>(
        game,
        step!,
        leadInvestigator(game),
        CHOICE.Target,
        "Dark Magician: place 1 doom on",
        near.map((e) => ({ id: e.id, label: def(game, e.id).name, card: e.id, value: e.id })),
        { auto: true, key: "chooseEnemy" },
      );
      if (pick === undefined) return;
      push(game, { t: STEP.PlaceDoom, card: pick, n: 1 }, { t: STEP.CheckDoom });
    },
  },
} satisfies CardScript;
