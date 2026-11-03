// Elokoss (Faint Embers) — spend clues to place 1 clue on her; 5 clues: (→R2)
import {
  addCounter,
  cardIf,
  type CardScript,
  emit,
  type GameContext,
  push,
  EVENT,
  STEP,
  type ScriptRun,
} from "../../../../src/engine/api";

export default {
  fns: {
    seal(game: GameContext, run: ScriptRun) {
      const e = cardIf(game, run.source);
      if (e?.zone !== "enemy") return;
      addCounter(game, e.id, "clues", 1);
      emit(game, EVENT.Clues, `1 clue is placed on Elokoss (${e.clues}/5)`, {
        card: e.id,
        data: { n: 1 },
      });
      if (e.clues >= 5) push(game, { t: STEP.Resolution, id: "R2" });
    },
  },
} satisfies CardScript;
