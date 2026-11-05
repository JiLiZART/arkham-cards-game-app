// Key to the Chamber — revelation: whoever drew it takes control of it; fast, if The Hidden Chamber is connected to your
// location: attach it to The Hidden Chamber (which unlocks its door, 02214)
import {
  card,
  type CardScript,
  connections,
  def,
  emit,
  type EffCtx,
  findByCode,
  type GameContext,
  inv,
  moveCard,
  setController,
  EVENT,
  ZONE,
  type ScriptRun,
} from "../../../../src/engine/api";

const CHAMBER = "02214";

/** The Hidden Chamber, when it is in play and connected to the investigator's location */
function chamberNextTo(game: GameContext, you: string | null | undefined) {
  const chamber = findByCode(game, CHAMBER, [ZONE.Location]);
  const here = you ? inv(game, you).location : null;
  return chamber && here && connections(game, here).includes(chamber.id) ? chamber.id : null;
}

export default {
  abilities: [
    { kind: "revelation", run: "take" },
    {
      kind: "fast",
      label: "Key to the Chamber: attach it to The Hidden Chamber",
      condition: { script: "chamberConnected" },
      run: "unlock",
    },
  ],
  conditions: {
    chamberConnected: (game: GameContext, ctx: EffCtx) =>
      !!ctx.source && card(game, ctx.source).zone === ZONE.Play && !!chamberNextTo(game, ctx.you),
  },
  fns: {
    take(game: GameContext, run: ScriptRun) {
      moveCard(game, run.source, ZONE.Play);
      setController(game, run.source, run.you);
      emit(game, EVENT.Control, `${def(game, run.source).name} is taken`, {
        inv: run.you,
        card: run.source,
      });
    },
    unlock(game: GameContext, run: ScriptRun) {
      const chamber = chamberNextTo(game, run.you);
      if (!chamber) return;
      moveCard(game, run.source, ZONE.Attached, { location: chamber });
      setController(game, run.source, null);
      emit(game, EVENT.Attach, `${def(game, run.source).name} is attached to The Hidden Chamber`, {
        card: run.source,
      });
    },
  },
} satisfies CardScript;
