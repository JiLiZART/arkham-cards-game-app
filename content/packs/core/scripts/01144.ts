// The Ritual Begins (Devourer Below, agenda 2) — back: each investigator tests willpower (6); failures gain a random Madness weakness
import {
  type CardScript,
  createCard,
  def,
  type EffCtx,
  emit,
  type G,
  inv,
  push,
  randomInt,
  resolveWeakness,
  resolvesOnDraw,
  turnOrder,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "back" }],
  fns: {
    back(g: G, ctx: EffCtx) {
      for (const i of turnOrder(g)) {
        if (inv(g, i).status !== "playing") continue;
        push(g, {
          t: "Eff",
          effect: {
            op: "skillTest",
            skill: "willpower",
            difficulty: 6,
            onFail: [{ op: "script", fn: "madness" }],
          },
          ctx: { you: i, source: ctx.source },
        });
      }
    },
    madness(g: G, ctx: EffCtx) {
      const pool = Object.values(g.db.cards).filter(
        (c) => c.subtype === "basicweakness" && c.traits.includes("Madness"),
      );
      if (!pool.length) return;
      const pick = pool[randomInt(g, pool.length)];
      const id = createCard(g, pick.code, "hand", ctx.you!);
      emit(g, "weakness", `${inv(g, ctx.you!).name} adds ${def(g, id).name} to their hand`, {
        inv: ctx.you!,
        card: id,
      });
      // a weakness that enters the hand without being drawn resolves as if drawn (Grimoire, Weakness)
      if (resolvesOnDraw(g, id)) resolveWeakness(g, ctx.you!, id);
    },
  },
} satisfies CardScript;
