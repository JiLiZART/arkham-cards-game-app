// Rational Thought — 4 horror in Carolyn's threat area; her horror heals go on it alone, and it leaves when it has none
import {
  addCounter,
  card,
  type CardScript,
  discard,
  type EffCtx,
  emit,
  type GameContext,
  inv,
  EVENT,
  argField,
  asNumber,
  asString,
} from "../../../../src/engine/api";

const isHealRequest = (v: unknown): v is { target: string; n: number } =>
  asString(argField(v, "target")) !== undefined && asNumber(argField(v, "n")) !== undefined;

export default {
  abilities: [
    {
      kind: "revelation",
      effects: [{ op: "putInThreatArea" }, { op: "placeTokens", on: "self", horror: 4 }],
    },
  ],
  hooks: {
    /** "You cannot heal horror from cards other than Rational Thought. Horror on it may be healed as if it were on Carolyn Fern." */
    healHorror(game: GameContext, ctx: EffCtx, args: unknown) {
      // the heal's request, written back: `n` is what may still be healed
      if (!isHealRequest(args)) return;
      const req = args;
      const rt = card(game, ctx.source!);
      if (rt.zone !== "threat" || !ctx.you || ctx.inv !== ctx.you) return;
      // ponytail: another investigator healing Carolyn heals Carolyn; the choice to heal Rational Thought instead isn't offered
      if (req.target === inv(game, ctx.you).cardId) {
        const take = Math.min(req.n, rt.horror);
        addCounter(game, rt.id, "horror", -take);
        if (take)
          emit(game, EVENT.Heal, `Rational Thought heals ${take} horror`, {
            inv: ctx.you,
            card: rt.id,
            data: { damage: 0, horror: take },
          });
        if (rt.horror === 0) discard(game, rt.id);
      }
      req.n = 0;
    },
  },
} satisfies CardScript;
