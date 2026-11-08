// Hastur's Last Stand (Return to Dim Carcosa, the story of Hastur's Domain): by the Hastur in play, the set-aside
// Recesses of Your Own Mind (The King in Yellow), The Throne Room (Lord of Carcosa, who moves there) or Stage of the Ward
// Theatre (The Tattered King) enters play, revealed; the card flips back and can't be flipped again.
import {
  type CardScript,
  def,
  emit,
  findByCode,
  type GameContext,
  moveCard,
  type ScriptRun,
  setCardLocation,
  EVENT,
  ZONE,
  queue,
  revealLocation,
} from "../../../../src/engine/api";
import {
  hastur,
  KING_IN_YELLOW,
  lock,
  LORD_OF_CARCOSA,
  TATTERED_KING,
} from "../../../campaigns/the-path-to-carcosa/scripts/dim-carcosa";

export const RECESSES = "52061";
export const THRONE_ROOM = "52062";
export const STAGE = "52063";
const BY_VERSION: Record<string, string> = {
  [KING_IN_YELLOW]: RECESSES,
  [LORD_OF_CARCOSA]: THRONE_ROOM,
  [TATTERED_KING]: STAGE,
};

export default {
  abilities: [{ kind: "revelation", run: "lastStand" }],
  fns: {
    lastStand(game: GameContext, run: ScriptRun) {
      lock(game, run.source);
      const h = hastur(game);
      const loc = h && findByCode(game, BY_VERSION[h.code], [ZONE.SetAside]);
      if (!h || !loc) return;
      moveCard(game, loc.id, ZONE.Location);
      emit(game, EVENT.Location, `${def(game, loc.id).name} is put into play`, { card: loc.id });
      if (h.code === LORD_OF_CARCOSA) setCardLocation(game, h.id, loc.id);
      queue(game, revealLocation(loc.id));
    },
  },
} satisfies CardScript;
