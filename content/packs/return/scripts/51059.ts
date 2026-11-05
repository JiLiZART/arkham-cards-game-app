// Towering Luminosity (Return to Lost in Time and Space) — its abilities are in cards.json; a clue on it flipped to its
// doom side here
import {
  addCounter,
  type CardScript,
  card,
  def,
  emit,
  EVENT,
  type GameContext,
  type ScriptRun,
} from "../../../../src/engine/api";
import { SHARED } from "../../../campaigns/the-dunwich-legacy/scripts/lost-in-time-and-space";

export default {
  fns: {
    ...SHARED.fns,
    flipClue(game: GameContext, run: ScriptRun) {
      if (card(game, run.source).clues <= 0) return;
      addCounter(game, run.source, "clues", -1);
      addCounter(game, run.source, "doom", 1);
      emit(game, EVENT.Doom, `A clue on ${def(game, run.source).name} turns to doom`, {
        card: run.source,
      });
    },
  },
} satisfies CardScript;
