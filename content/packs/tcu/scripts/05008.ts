// Rational Thought — 4 horror in Carolyn's threat area; her horror heals go on it alone, and it leaves when it has none
import {
  addCounter,
  card,
  type CardScript,
  discard,
  emit,
  type GameContext,
  inv,
  EVENT,
  type HookRun,
  type InstId,
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
    healHorror(game: GameContext, run: HookRun, target: InstId, n: number) {
      const rt = card(game, run.source);
      const you = run.ctx.you;
      if (rt.zone !== "threat" || !you || run.ctx.inv !== you) return n;
      // ponytail: another investigator healing Carolyn heals Carolyn; the choice to heal Rational Thought instead isn't offered
      if (target === inv(game, you).cardId) {
        const take = Math.min(n, rt.horror);
        addCounter(game, rt.id, "horror", -take);
        if (take)
          emit(game, EVENT.Heal, `Rational Thought heals ${take} horror`, {
            inv: you,
            card: rt.id,
            data: { damage: 0, horror: take },
          });
        if (rt.horror === 0) discard(game, rt.id);
      }
      return 0;
    },
  },
} satisfies CardScript;
