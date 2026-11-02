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
  type GameContext,
  inv,
  push,
  threatArea,
  EVENT,
  STEP,
} from "../../../../src/engine/api";

export default {
  fns: {
    intoThreat(game: GameContext, ctx: EffCtx) {
      const code = card(game, ctx.source!).code;
      if (threatArea(game, ctx.you!).some((c) => c.code === code)) return;
      push(game, { t: STEP.Eff, effect: { op: "putInThreatArea" }, ctx });
    },
    languor(game: GameContext, ctx: EffCtx) {
      const me = inv(game, ctx.you!);
      const top = me.deck[0];
      if (!top) return;
      const d = def(game, top);
      if (d.subtype) {
        push(game, { t: STEP.Draw, inv: ctx.you!, n: 1, tapped: true });
        return;
      }
      discard(game, top);
      addTempMod(
        game,
        { flag: "cannotPlayOrCommit", filter: { type: d.type } },
        ctx.you!,
        "round",
        ctx.source!,
      );
      emit(game, EVENT.Languor, `${me.name} cannot play or commit ${d.type} cards this round`, {
        inv: ctx.you!,
      });
    },
  },
} satisfies CardScript;
