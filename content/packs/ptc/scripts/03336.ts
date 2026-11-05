// Winged One (Dim Carcosa): spawns at Bleak Plains, retaliate (data). "After a location is flipped over, if Winged One
// is ready and unengaged: Move it once toward that location": the scenario's flipLocation moves it as the location
// flips (toward the place the location holds on the map; the lead choosing among equal paths is not asked: the first).
import {
  type CardScript,
  def,
  emit,
  enemies,
  type GameContext,
  type InstId,
  setCardLocation,
  stepsToward,
  EVENT,
} from "../../../../src/engine/api";

export const WINGED_ONE = "03336";

export function wingedOneMoves(game: GameContext, loc: InstId) {
  for (const e of enemies(game)) {
    if (e.code !== WINGED_ONE || e.exhausted || e.engagedWith || !e.location) continue;
    const to = stepsToward(game, e.location, [loc], e.id)[0];
    if (!to) continue;
    const from = e.location;
    setCardLocation(game, e.id, to);
    emit(game, EVENT.EnemyMove, `${def(game, e.id).name} moves to ${def(game, to).name}`, {
      card: e.id,
      data: { from, to },
    });
  }
}

export default {} satisfies CardScript;
