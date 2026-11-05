// Night at the Museum (The Miskatonic Museum, act 2) — objective: an investigator enters the Restricted Hall (the
// scenario's checkObjectives); back: Hunting Horror, wherever it is, placed ready in the Restricted Hall. "Breaking and
// Entering" (02124) has the same back, with Harold Walsted joining the investigators first
import {
  card,
  type CardScript,
  def,
  emit,
  findByCode,
  type GameContext,
  type InstId,
  ready,
  setCardLocation,
  setEngaged,
  EVENT,
  ZONE,
} from "../../../../src/engine/api";
import { HORROR, spawnHorror } from "./02141";

export const RESTRICTED_HALL = "02137";

/** "search the encounter deck, discard pile, the void, and all play areas for Hunting Horror, and place it in the
 * Restricted Hall, ready" */
export function horrorToRestrictedHall(game: GameContext) {
  const hall = findByCode(game, RESTRICTED_HALL, [ZONE.Location]);
  if (!hall) return;
  const h = findByCode(game, HORROR, [ZONE.Enemy]);
  if (h) moveHorror(game, h.id, hall.id);
  else spawnHorror(game, { at: hall.id });
}

function moveHorror(game: GameContext, h: InstId, to: InstId) {
  const from = card(game, h).location;
  setEngaged(game, h, null);
  setCardLocation(game, h, to);
  ready(game, h);
  emit(game, EVENT.EnemyMove, `${def(game, h).name} is placed in ${def(game, to).name}`, {
    card: h,
    data: { from, to },
  });
}

export default {
  abilities: [{ kind: "revelation", run: "back" }],
  fns: {
    back: horrorToRestrictedHall,
  },
} satisfies CardScript;
