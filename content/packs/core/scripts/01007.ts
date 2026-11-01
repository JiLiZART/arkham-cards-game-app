// Cover Up — discard clues from Cover Up instead of discovering them; trauma if clues remain at game end
import {
  addCounter,
  cancelEvent,
  card,
  type CardScript,
  type EffCtx,
  emit,
  type G,
} from "../../../../src/engine/api";

export default {
  abilities: [
    {
      kind: "reaction",
      trigger: "wouldDiscoverClues",
      label: "Cover Up: remove clues from Cover Up instead",
      condition: { selfHasClues: true },
      run: "coverUp",
    },
  ],
  fns: {
    coverUp(g: G, ctx: EffCtx) {
      const c = card(g, ctx.source!);
      const n = Math.min(ctx.x ?? 1, c.clues);
      addCounter(g, c.id, "clues", -n);
      if (ctx.key) cancelEvent(g, ctx.key);
      emit(g, "coverUp", `${n} clue(s) are discarded from Cover Up (${c.clues} left)`, {
        card: c.id,
        data: { n },
      });
    },
  },
  hooks: {
    gameEnd(g: G, ctx: EffCtx) {
      const c = card(g, ctx.source!);
      if (c.clues > 0 && c.controller) addCounter(g, c.controller, "mentalTrauma", 1);
    },
  },
} satisfies CardScript;
