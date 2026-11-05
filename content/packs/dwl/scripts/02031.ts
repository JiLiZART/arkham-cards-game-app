// Bind Monster — evaded by a success, a non-Elite enemy has Bind Monster attached (the evade and the "would ready"
// reaction are in cards.json)
import {
  attachTo,
  cardIf,
  type CardScript,
  def,
  emit,
  EVENT,
  type GameContext,
  isElite,
  moveCard,
  type ScriptRun,
  setController,
  ZONE,
} from "../../../../src/engine/api";

export default {
  fns: {
    bind(game: GameContext, run: ScriptRun) {
      const enemy = run.ctx.enemy;
      if (!enemy || cardIf(game, enemy)?.zone !== ZONE.Enemy || isElite(game, enemy)) return;
      moveCard(game, run.source, ZONE.Attached);
      attachTo(game, run.source, enemy);
      setController(game, run.source, run.you);
      emit(game, EVENT.Attach, `Bind Monster is attached to ${def(game, enemy).name}`, {
        card: run.source,
      });
    },
  },
} satisfies CardScript;
