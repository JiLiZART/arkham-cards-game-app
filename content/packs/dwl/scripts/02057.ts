// Alchemy Labs — unrevealed: you cannot move into it; investigate: on a success, instead of discovering clues, take the
// Alchemical Concoction from beneath it
import {
  type CardScript,
  cardsBeneath,
  def,
  emit,
  type GameContext,
  moveCard,
  setController,
  EVENT,
  ZONE,
  type ScriptRun,
} from "../../../../src/engine/api";
import { locked } from "./02052";

export default {
  modifiers: locked,
  abilities: [
    {
      kind: "action",
      designator: "investigate",
      label: "Alchemy Labs: investigate (take the Alchemical Concoction)",
      effects: [{ op: "investigate", insteadOfClues: [{ op: "script", fn: "take" }] }],
    },
  ],
  fns: {
    take(game: GameContext, run: ScriptRun) {
      const concoction = cardsBeneath(game, run.source).find(
        (id) => def(game, id).code === "02059",
      );
      if (!concoction) return;
      moveCard(game, concoction, ZONE.Play);
      setController(game, concoction, run.you);
      emit(game, EVENT.Control, "You take the Alchemical Concoction", {
        inv: run.you,
        card: concoction,
      });
    },
  },
} satisfies CardScript;
