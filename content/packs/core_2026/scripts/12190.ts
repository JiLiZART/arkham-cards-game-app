// Blasphemous Invocation — per point failed, 1 doom on a Cultist with no doom; none placed: draw a Cultist from the encounter deck or discard
import {
  ask,
  def,
  enemies,
  push,
  type CardScript,
  type EffCtx,
  type G,
  type InstId,
  type Step,
} from "../../../../src/engine/api";

export default {
  fns: {
    blaspheme(g: G, ctx: EffCtx, args: { left: number; placed: number } | undefined, step?: Step) {
      const left = args?.left ?? ctx.failBy ?? 0;
      const placed = args?.placed ?? 0;
      const pool = enemies(g).filter(
        (e) => e.doom === 0 && def(g, e.id).traits.includes("Cultist"),
      );
      if (left > 0 && pool.length) {
        const pick = ask<InstId>(
          g,
          step!,
          ctx.you!,
          "target",
          "Blasphemous Invocation: place 1 doom on a Cultist",
          pool.map((e) => ({ id: e.id, label: def(g, e.id).name, card: e.id, value: e.id })),
          { auto: true, key: "chooseEnemy" },
        );
        if (pick === undefined) return;
        push(
          g,
          { t: "PlaceDoom", card: pick, n: 1 },
          { t: "CheckDoom" },
          {
            t: "Script",
            code: "12190",
            fn: "blaspheme",
            ctx,
            args: { left: left - 1, placed: placed + 1 },
          },
        );
        return;
      }
      if (!placed)
        push(g, {
          t: "Eff",
          effect: { op: "searchEncounterDraw", filter: { type: "enemy", trait: "Cultist" } },
          ctx,
        });
    },
  },
} satisfies CardScript;
