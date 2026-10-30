// Rational Thought — 4 horror in Carolyn's threat area; her horror heals go on it alone, and it leaves when it has none
import {
  card,
  discard,
  emit,
  inv,
  type CardScript,
  type EffCtx,
  type G,
} from "../../../../src/engine/api";

export default {
  abilities: [
    {
      kind: "revelation",
      effects: [{ op: "putInThreatArea" }, { op: "placeTokens", on: "self", horror: 4 }],
    },
  ],
  hooks: {
    /** "You cannot heal horror from cards other than Rational Thought. Horror on it may be healed as if it were on Carolyn Fern." */
    healHorror(g: G, ctx: EffCtx, req: { target: string; n: number }) {
      const rt = card(g, ctx.source!);
      if (rt.zone !== "threat" || !ctx.you || ctx.inv !== ctx.you) return;
      // ponytail: another investigator healing Carolyn heals Carolyn; the choice to heal Rational Thought instead isn't offered
      if (req.target === inv(g, ctx.you).cardId) {
        const take = Math.min(req.n, rt.horror);
        rt.horror -= take;
        if (take)
          emit(g, "heal", `Rational Thought heals ${take} horror`, {
            inv: ctx.you,
            card: rt.id,
            data: { damage: 0, horror: take },
          });
        if (rt.horror === 0) discard(g, rt.id);
      }
      req.n = 0;
    },
  },
} satisfies CardScript;
