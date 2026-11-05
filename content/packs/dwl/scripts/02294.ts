// Devotee of the Key (Where Doom Awaits) — spawn: Base of the Hill (its data); forced, at the end of the enemy phase: it
// moves once toward Sentinel Peak; already there, it is discarded and 2 doom go on the current agenda instead
import {
  canEnemyEnter,
  card,
  type CardScript,
  def,
  discard,
  emit,
  EVENT,
  findByCode,
  type GameContext,
  placeDoom,
  queue,
  type ScriptRun,
  setCardLocation,
  setEngaged,
  stepsToward,
  ZONE,
} from "../../../../src/engine/api";
import { PEAK } from "../../../campaigns/the-dunwich-legacy/scripts/where-doom-awaits";

export default {
  fns: {
    towardPeak(game: GameContext, run: ScriptRun) {
      const me = run.source;
      const from = card(game, me).location;
      const peak = findByCode(game, PEAK, [ZONE.Location])?.id;
      if (!from || !peak) return;
      if (from === peak) {
        discard(game, me);
        queue(game, placeDoom({ card: "agenda", n: 2 }));
        return;
      }
      const to = stepsToward(game, from, [peak]).find((l) => canEnemyEnter(game, me, l));
      if (!to) return;
      // an engaged enemy moved by its own text leaves the investigator it was engaged with
      setEngaged(game, me, null);
      setCardLocation(game, me, to);
      emit(game, EVENT.EnemyMove, `${def(game, me).name} moves toward Sentinel Peak`, {
        card: me,
        data: { from, to },
      });
    },
  },
} satisfies CardScript;
