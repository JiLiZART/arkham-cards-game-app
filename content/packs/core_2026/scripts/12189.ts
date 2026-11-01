// Dark Magician — when the round ends: 1 doom on the enemy with no doom nearest to it
import {
  ask,
  cardIf,
  type CardScript,
  def,
  distances,
  type EffCtx,
  enemies,
  type G,
  type InstId,
  leadInvestigator,
  push,
  type Step,
} from "../../../../src/engine/api";

export default {
  fns: {
    invoke(g: G, ctx: EffCtx, _args: unknown, step?: Step) {
      const me = cardIf(g, ctx.source!);
      if (me?.zone !== "enemy" || !me.location) return;
      const pool = enemies(g).filter((e) => e.doom === 0 && e.location);
      if (!pool.length) return;
      const d = distances(g, me.location);
      const best = Math.min(...pool.map((e) => d.get(e.location!) ?? Infinity));
      const near = pool.filter((e) => (d.get(e.location!) ?? Infinity) === best);
      const pick = ask<InstId>(
        g,
        step!,
        leadInvestigator(g),
        "target",
        "Dark Magician: place 1 doom on",
        near.map((e) => ({ id: e.id, label: def(g, e.id).name, card: e.id, value: e.id })),
        { auto: true, key: "chooseEnemy" },
      );
      if (pick === undefined) return;
      push(g, { t: "PlaceDoom", card: pick, n: 1 }, { t: "CheckDoom" });
    },
  },
} satisfies CardScript;
