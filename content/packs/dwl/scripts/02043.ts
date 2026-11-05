// Dead of Night (Extracurricular Activity, agenda 2) — hand size 3 lower; back: the Dormitories, and The Experiment
// moves toward them or spawns in the Science Building
import {
  canEnemyEnter,
  type CardScript,
  def,
  emit,
  findByCode,
  type GameContext,
  moveCard,
  setCardLocation,
  stepsToward,
  turnOrder,
  EVENT,
  ZONE,
  queue,
  checkObjectives,
  spawn,
} from "../../../../src/engine/api";

const DORMITORIES = "02052";
const EXPERIMENT = "02058";

/** a set-aside location into play, if it is still set aside */
export function putLocationIntoPlay(game: GameContext, code: string) {
  const c = findByCode(game, code, [ZONE.SetAside]);
  if (!c) return;
  moveCard(game, c.id, ZONE.Location);
  emit(game, EVENT.Location, `${def(game, c.id).name} is put into play`, { card: c.id });
}

/** The Experiment moves 1 location toward the Dormitories, if both are in play */
export function experimentStep(game: GameContext) {
  const e = findByCode(game, EXPERIMENT, [ZONE.Enemy]);
  const dorms = findByCode(game, DORMITORIES, [ZONE.Location]);
  if (!e?.location || !dorms || e.location === dorms.id) return;
  const to = stepsToward(game, e.location, [dorms.id]).find((l) => canEnemyEnter(game, e.id, l));
  if (!to) return;
  const from = e.location;
  setCardLocation(game, e.id, to);
  emit(game, EVENT.EnemyMove, `${def(game, e.id).name} moves toward the Dormitories`, {
    card: e.id,
    data: { from, to },
  });
  queue(game, checkObjectives());
}

export default {
  abilities: [{ kind: "revelation", run: "back" }],
  modifiers(game: GameContext) {
    return turnOrder(game).map((i) => ({
      target: i,
      mod: { stat: "handSize" as const, value: -3 },
    }));
  },
  fns: {
    back(game: GameContext) {
      putLocationIntoPlay(game, DORMITORIES);
      if (findByCode(game, EXPERIMENT, [ZONE.Enemy])) {
        experimentStep(game);
        return;
      }
      const science = findByCode(game, "02056", [ZONE.Location]);
      const aside = findByCode(game, EXPERIMENT, [ZONE.SetAside]);
      if (aside && science) queue(game, spawn({ enemy: aside.id, inv: null, at: science.id }));
    },
  },
} satisfies CardScript;
