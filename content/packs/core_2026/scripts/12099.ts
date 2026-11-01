// The Nameless Lurker — when the investigation phase ends, if it is ready with no doom: 1 doom on it
import {
  cardIf,
  type CardScript,
  currentPhase,
  type EffCtx,
  type G,
  push,
} from "../../../../src/engine/api";

export default {
  fns: {
    lurk(g: G, ctx: EffCtx) {
      const e = cardIf(g, ctx.source!);
      if (
        currentPhase(g) === "investigation" &&
        e?.zone === "enemy" &&
        !e.exhausted &&
        e.doom === 0
      )
        push(g, { t: "PlaceDoom", card: e.id, n: 1 });
    },
  },
} satisfies CardScript;
