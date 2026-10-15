// Dynamite Blast — 3 damage to each enemy and each investigator at your location or a connecting one
import { ask, connections, def, enemiesAt, inv, invsAt, push, type CardScript, type EffCtx, type G, type InstId, type Step } from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "onPlay", run: "blast" }],
  fns: {
    blast(g: G, ctx: EffCtx, _args: unknown, step?: Step) {
      const here = inv(g, ctx.you!).location!;
      const opts = [here, ...connections(g, here)];
      const loc = ask<InstId>(g, step!, ctx.you!, "target", "Dynamite Blast: choose a location",
        opts.map((l) => ({ id: l, label: def(g, l).name, card: l, value: l })), { auto: true, key: "cardChooseLocation", vars: { card: ctx.source ?? null } });
      if (loc === undefined) return;
      for (const e of enemiesAt(g, loc)) push(g, { t: "DamageEnemy", enemy: e.id, amount: 3, by: ctx.you! });
      for (const i of invsAt(g, loc)) push(g, { t: "AssignDamage", inv: i, damage: 3, horror: 0, direct: false, source: ctx.source ?? null });
    },
  },
} satisfies CardScript;
