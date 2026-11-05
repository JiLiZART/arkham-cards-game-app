// Engine Car (Return to The Essex County Express) — unrevealed: it can't be entered while the location to its left has
// clues; revealed: it can't be investigated (data), and the set-aside Engineer is put into play here, uncontrolled
import {
  type CardScript,
  def,
  emit,
  EVENT,
  findByCode,
  type GameContext,
  moveCard,
  type ScriptRun,
  setController,
  ZONE,
} from "../../../../src/engine/api";
import { lockedBehind } from "../../../campaigns/the-dunwich-legacy/scripts/essex-county-express";

export default {
  modifiers: lockedBehind,
  fns: {
    engineer(game: GameContext, run: ScriptRun) {
      const engineer = findByCode(game, "51031", [ZONE.SetAside]);
      if (!engineer) return;
      moveCard(game, engineer.id, ZONE.Attached, { location: run.source });
      setController(game, engineer.id, null);
      emit(game, EVENT.Location, `The Engineer is in the ${def(game, run.source).name}`, {
        card: engineer.id,
      });
    },
  },
} satisfies CardScript;
