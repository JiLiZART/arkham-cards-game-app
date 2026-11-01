// Languor — into your threat area (limit 1 per investigator); when your turn begins, discard your top card: a weakness
// is drawn, any other card type can't be played or committed this round
import {
  addTempMod,
  card,
  type CardScript,
  def,
  discard,
  type EffCtx,
  emit,
  type G,
  inv,
  push,
  threatArea,
} from "../../../../src/engine/api";

export default {
  fns: {
    intoThreat(g: G, ctx: EffCtx) {
      const code = card(g, ctx.source!).code;
      if (threatArea(g, ctx.you!).some((c) => c.code === code)) return;
      push(g, { t: "Eff", effect: { op: "putInThreatArea" }, ctx });
    },
    languor(g: G, ctx: EffCtx) {
      const me = inv(g, ctx.you!);
      const top = me.deck[0];
      if (!top) return;
      const d = def(g, top);
      if (d.subtype) {
        push(g, { t: "Draw", inv: ctx.you!, n: 1, tapped: true });
        return;
      }
      discard(g, top);
      addTempMod(
        g,
        { flag: "cannotPlayOrCommit", filter: { type: d.type } },
        ctx.you!,
        "round",
        ctx.source!,
      );
      emit(g, "languor", `${me.name} cannot play or commit ${d.type} cards this round`, {
        inv: ctx.you!,
      });
    },
  },
} satisfies CardScript;
