// The Necronomicon — move 1 horror from it to Daisy; discard it when empty
import {
  addCounter,
  card,
  type CardScript,
  discard,
  type EffCtx,
  type G,
  push,
} from "../../../../src/engine/api";

export default {
  abilities: [
    { kind: "action", label: "The Necronomicon: move 1 horror to yourself", run: "moveHorror" },
  ],
  fns: {
    moveHorror(g: G, ctx: EffCtx) {
      const c = card(g, ctx.source!);
      if (c.horror <= 0) return;
      addCounter(g, c.id, "horror", -1);
      push(g, {
        t: "AssignDamage",
        inv: ctx.you!,
        damage: 0,
        horror: 1,
        direct: true,
        source: c.id,
      });
      if (c.horror === 0) discard(g, c.id);
    },
  },
} satisfies CardScript;
