// Elokoss (Faint Embers) — spend clues to place 1 clue on her; 5 clues: (→R2)
import {
  addCounter,
  cardIf,
  type CardScript,
  type EffCtx,
  emit,
  type G,
  push,
} from "../../../../src/engine/api";

export default {
  fns: {
    seal(g: G, ctx: EffCtx) {
      const e = cardIf(g, ctx.source!);
      if (e?.zone !== "enemy") return;
      addCounter(g, e.id, "clues", 1);
      emit(g, "clues", `1 clue is placed on Elokoss (${e.clues}/5)`, {
        card: e.id,
        data: { n: 1 },
      });
      if (e.clues >= 5) push(g, { t: "Resolution", id: "R2" });
    },
  },
} satisfies CardScript;
