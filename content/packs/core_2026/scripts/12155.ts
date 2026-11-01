// Miskatonic University (In Flames) — when the investigation phase ends: 1 direct damage to each player card with health here
import {
  type CardScript,
  cardsIn,
  currentPhase,
  def,
  type EffCtx,
  type G,
  invsAt,
  push,
} from "../../../../src/engine/api";

export default {
  fns: {
    inFlames(g: G, ctx: EffCtx) {
      if (currentPhase(g) !== "investigation") return;
      for (const i of invsAt(g, ctx.source!)) {
        push(g, {
          t: "AssignDamage",
          inv: i,
          damage: 1,
          horror: 0,
          direct: true,
          source: ctx.source!,
        });
        for (const a of cardsIn(g, "play"))
          if (a.controller === i && (def(g, a.id).health ?? 0) > 0) a.damage++;
        push(g, { t: "Script", code: "__engine", fn: "assetDefeatCheck", ctx: { you: i } });
      }
    },
  },
} satisfies CardScript;
