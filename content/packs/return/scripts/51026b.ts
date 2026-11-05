// The Conductor (Return to The Essex County Express, agenda 0's other side) — spawns at the leftmost car and moves right
// when its car leaves play (the scenario's hooks). Defeated, it goes to the encounter discard pile and from there is
// attached to the current agenda (`leavesPlay`); when that agenda advances it waits in limbo, and the agenda's back
// draws it again once the cars are gone (02160's keepMoving)
import {
  attachTo,
  card,
  type CardScript,
  currentAgenda,
  def,
  type EffCtx,
  emit,
  EVENT,
  type GameContext,
  moveCard,
  type ScriptRun,
  ZONE,
} from "../../../../src/engine/api";

export default {
  abilities: [
    {
      kind: "forced",
      trigger: "agendaAdvances",
      condition: { script: "onTheAgenda" },
      run: "ride",
    },
  ],
  conditions: {
    /** attached to the agenda that advances */
    onTheAgenda: (game: GameContext, ctx: EffCtx) => {
      const c = card(game, ctx.source!);
      return c.zone === ZONE.Attached && c.attachedTo === ctx.card;
    },
  },
  fns: {
    /** "When The Conductor is defeated: attach it to the current agenda" */
    attach(game: GameContext, run: ScriptRun) {
      const agenda = currentAgenda(game);
      if (card(game, run.source).zone !== ZONE.EncounterDiscard || !agenda) return;
      moveCard(game, run.source, ZONE.Attached);
      attachTo(game, run.source, agenda);
      emit(game, EVENT.Attach, `The Conductor is attached to ${def(game, agenda).name}`, {
        card: run.source,
      });
    },
    /** the attached agenda advances: The Conductor leaves it, to be drawn after the advance */
    ride(game: GameContext, run: ScriptRun) {
      attachTo(game, run.source, null);
      moveCard(game, run.source, ZONE.Limbo);
    },
  },
} satisfies CardScript;
