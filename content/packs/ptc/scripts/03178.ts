// Patient Confinement (Daniel's Cell) — 1 clue to enter while unrevealed (its data: `enterClues`). After it is
// revealed: advance to act 2b (during either version of act 2).
import {
  cardIf,
  type CardScript,
  currentAct,
  type GameContext,
  queue,
  advanceAct,
} from "../../../../src/engine/api";

const ACT_2 = ["03164", "03165"];

export default {
  abilities: [{ kind: "forced", trigger: "revealed", run: "danielsCell" }],
  fns: {
    danielsCell(game: GameContext) {
      if (ACT_2.includes(cardIf(game, currentAct(game))?.code ?? "")) queue(game, advanceAct());
    },
  },
} satisfies CardScript;
