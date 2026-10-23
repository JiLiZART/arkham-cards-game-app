// Elokoss (Faint Embers) — spend clues to place 1 clue on her; 5 clues: (→R2)
import { emit, push, type CardScript, type EffCtx, type G } from "../../../../src/engine/api";

export default {
  fns: {
    seal(g: G, ctx: EffCtx) {
      const e = g.s.cards[ctx.source!];
      if (e?.zone !== "enemy") return;
      e.clues++;
      emit(g, "clues", `1 clue is placed on Elokoss (${e.clues}/5)`, {
        card: e.id,
        data: { n: 1 },
      });
      if (e.clues >= 5) push(g, { t: "Resolution", id: "R2" });
    },
  },
} satisfies CardScript;
