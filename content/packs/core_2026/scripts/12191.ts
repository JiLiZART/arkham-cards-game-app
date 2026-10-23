// Unnatural Decay — 1 doom on an asset you control
import {
  ask,
  controlled,
  def,
  push,
  type CardScript,
  type EffCtx,
  type G,
  type InstId,
  type Step,
} from "../../../../src/engine/api";

export default {
  fns: {
    decay(g: G, ctx: EffCtx, _args: unknown, step?: Step) {
      const assets = controlled(g, ctx.you!);
      if (!assets.length) return;
      const pick = ask<InstId>(
        g,
        step!,
        ctx.you!,
        "target",
        "Unnatural Decay: place 1 doom on an asset",
        assets.map((c) => ({ id: c.id, label: def(g, c.id).name, card: c.id, value: c.id })),
        { auto: true, key: "chooseAsset" },
      );
      if (pick === undefined) return;
      push(g, { t: "PlaceDoom", card: pick, n: 1 }, { t: "CheckDoom" });
    },
  },
} satisfies CardScript;
