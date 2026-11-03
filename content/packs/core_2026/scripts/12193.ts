// Languor — into your threat area (limit 1 per investigator); when your turn begins, discard your top card: a weakness
// is drawn, any other card type can't be played or committed this round
import {
  addTempMod,
  card,
  type CardScript,
  def,
  discard,
  emit,
  type GameContext,
  inv,
  threatArea,
  EVENT,
  type ScriptRun,
  queue,
  resolveEffect,
  drawCards,
} from "../../../../src/engine/api";

export default {
  fns: {
    intoThreat(game: GameContext, run: ScriptRun) {
      const code = card(game, run.source).code;
      if (threatArea(game, run.you).some((c) => c.code === code)) return;
      queue(game, resolveEffect({ effect: { op: "putInThreatArea" }, ctx: run.ctx }));
    },
    languor(game: GameContext, run: ScriptRun) {
      const me = inv(game, run.you);
      const top = me.deck[0];
      if (!top) return;
      const d = def(game, top);
      if (d.subtype) {
        queue(game, drawCards({ inv: run.you, n: 1, tapped: true }));
        return;
      }
      discard(game, top);
      addTempMod(
        game,
        { flag: "cannotPlayOrCommit", filter: { type: d.type } },
        run.you,
        "round",
        run.source,
      );
      emit(game, EVENT.Languor, `${me.name} cannot play or commit ${d.type} cards this round`, {
        inv: run.you,
      });
    },
  },
} satisfies CardScript;
