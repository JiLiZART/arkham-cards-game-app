// Dynamite Blast — 3 damage to each enemy and each investigator at your location or a connecting one
import {
  ask,
  connections,
  def,
  enemiesAt,
  inv,
  invsAt,
  push,
  type CardScript,
  type EffCtx,
  type GameContext,
  type InstId,
  type Step,
  CHOICE,
  STEP,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "onPlay", run: "blast" }],
  fns: {
    blast(game: GameContext, ctx: EffCtx, _args: unknown, step?: Step) {
      const here = inv(game, ctx.you!).location!;
      const opts = [here, ...connections(game, here)];
      const loc = ask<InstId>(
        game,
        step!,
        ctx.you!,
        CHOICE.Target,
        "Dynamite Blast: choose a location",
        opts.map((l) => ({ id: l, label: def(game, l).name, card: l, value: l })),
        { auto: true, key: "cardChooseLocation", vars: { card: ctx.source ?? null } },
      );
      if (loc === undefined) return;
      for (const e of enemiesAt(game, loc))
        push(game, { t: STEP.DamageEnemy, enemy: e.id, amount: 3, by: ctx.you! });
      for (const i of invsAt(game, loc))
        push(game, {
          t: STEP.AssignDamage,
          inv: i,
          damage: 3,
          horror: 0,
          direct: false,
          source: ctx.source ?? null,
        });
    },
  },
} satisfies CardScript;
