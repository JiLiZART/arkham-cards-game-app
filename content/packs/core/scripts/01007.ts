// Cover Up — discard clues from Cover Up instead of discovering them; trauma if clues remain at game end
import { card, emit, inv, type CardScript, type EffCtx, type G } from "../../../../src/engine/api";

export default {
  abilities: [
    { kind: "reaction", trigger: "wouldDiscoverClues", label: "Cover Up: remove clues from Cover Up instead", condition: { selfHasClues: true }, run: "coverUp" },
  ],
  fns: {
    coverUp(g: G, ctx: EffCtx) {
      const c = card(g, ctx.source!);
      const n = Math.min(ctx.x ?? 1, c.clues);
      c.clues -= n;
      if (ctx.key) g.s.cancelled.push(ctx.key);
      emit(g, "coverUp", `${n} clue(s) are discarded from Cover Up (${c.clues} left)`, { card: c.id, data: { n } });
    },
  },
  hooks: {
    gameEnd(g: G, ctx: EffCtx) {
      const c = card(g, ctx.source!);
      if (c.clues > 0 && c.controller) inv(g, c.controller).mentalTrauma++;
    },
  },
} satisfies CardScript;
