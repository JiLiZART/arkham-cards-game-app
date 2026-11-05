// Race for Answers (Echoes of the Past, act 1) — back: each revealed Historical Society gets 1 clue per investigator,
// to at most its clue value.
import {
  addCounter,
  card,
  type CardScript,
  def,
  emit,
  type GameContext,
  locations,
  playerCount,
  EVENT,
} from "../../../../src/engine/api";

/** "For each revealed Historical Society location, add 1 [per_investigator] clues to it (to a maximum of its clue value)" */
export function lateNightStudies(game: GameContext) {
  const n = playerCount(game);
  for (const l of locations(game)) {
    const d = def(game, l.id);
    if (d.name !== "Historical Society" || !l.revealed) continue;
    const max = (d.clues ?? 0) * (d.cluesPerInvestigator ? n : 1);
    const add = Math.max(0, Math.min(n, max - card(game, l.id).clues));
    if (!add) continue;
    addCounter(game, l.id, "clues", add);
    emit(game, EVENT.Place, `${add} clue(s) placed on ${d.name}`, {
      card: l.id,
      data: { clues: add },
    });
  }
}

export default {
  abilities: [{ kind: "revelation", run: "lateNightStudies" }],
  fns: { lateNightStudies },
} satisfies CardScript;
