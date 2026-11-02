// Unnatural Decay — 1 doom on an asset you control
import {
  ask,
  controlled,
  def,
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
  fns: {
    decay(game: GameContext, ctx: EffCtx, _args: unknown, step?: Step) {
      const assets = controlled(game, ctx.you!);
      if (!assets.length) return;
      const pick = ask<InstId>(
        game,
        step!,
        ctx.you!,
        CHOICE.Target,
        "Unnatural Decay: place 1 doom on an asset",
        assets.map((c) => ({ id: c.id, label: def(game, c.id).name, card: c.id, value: c.id })),
        { auto: true, key: "chooseAsset" },
      );
      if (pick === undefined) return;
      push(game, { t: STEP.PlaceDoom, card: pick, n: 1 }, { t: STEP.CheckDoom });
    },
  },
} satisfies CardScript;
