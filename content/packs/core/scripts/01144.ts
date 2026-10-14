// The Ritual Begins (Devourer Below, agenda 2) — back: each investigator tests willpower (6); failures gain a random Madness weakness
import { createCard, def, emit, push, randInt, type CardScript, type EffCtx, type G } from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "back" }],
  fns: {
    back(g: G, ctx: EffCtx) {
      for (const i of g.s.order) {
        if (g.s.invs[i].status !== "playing") continue;
        push(g, { t: "Eff", effect: { op: "skillTest", skill: "willpower", difficulty: 6, onFail: [{ op: "script", fn: "madness" }] }, ctx: { you: i, source: ctx.source } });
      }
    },
    madness(g: G, ctx: EffCtx) {
      const pool = Object.values(g.db.cards).filter((c) => c.subtype === "basicweakness" && c.traits.includes("Madness"));
      if (!pool.length) return;
      const pick = pool[randInt(g.s, pool.length)];
      const id = createCard(g, pick.code, "hand", ctx.you!);
      emit(g, "weakness", `${g.s.invs[ctx.you!].name} adds ${def(g, id).name} to their hand`, { inv: ctx.you!, card: id });
    },
  },
} satisfies CardScript;
