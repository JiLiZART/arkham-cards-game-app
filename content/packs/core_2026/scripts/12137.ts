// Mark of Elokoss — when your turn ends: 1 damage, on an asset you control if able
import {
  addCounter,
  ask,
  type CardScript,
  controlled,
  def,
  type EffCtx,
  emit,
  type GameContext,
  type InstId,
  push,
  type Step,
  EVENT,
  CHOICE,
  STEP,
} from "../../../../src/engine/api";

export default {
  fns: {
    mark(game: GameContext, ctx: EffCtx, _args: unknown, step?: Step) {
      const you = ctx.you!;
      const assets = controlled(game, you).filter((c) => (def(game, c.id).health ?? 0) > c.damage);
      if (!assets.length) {
        push(game, {
          t: STEP.AssignDamage,
          inv: you,
          damage: 1,
          horror: 0,
          direct: false,
          source: ctx.source ?? null,
        });
        return;
      }
      const pick = ask<InstId>(
        game,
        step!,
        you,
        CHOICE.Target,
        "Mark of Elokoss: assign 1 damage to an asset",
        assets.map((c) => ({ id: c.id, label: def(game, c.id).name, card: c.id, value: c.id })),
        { auto: true, key: "chooseAsset" },
      );
      if (pick === undefined) return;
      addCounter(game, pick, "damage", 1);
      emit(game, EVENT.AssetDamage, `${def(game, pick).name} takes 1 damage`, {
        card: pick,
        inv: you,
        data: { damage: 1, horror: 0, source: ctx.source ?? null },
      });
      push(game, { t: STEP.Script, code: "__engine", fn: "assetDefeatCheck", ctx: { you } });
    },
  },
} satisfies CardScript;
