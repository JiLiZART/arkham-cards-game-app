// The Beast Unleashed (Extracurricular Activity, agenda 3) — at its doom threshold: all doom removed and The Experiment
// moves toward the Dormitories instead of advancing; back: 3 horror each, then (→R4)
import {
  allCards,
  type CardScript,
  emit,
  type GameContext,
  setCounter,
  turnOrder,
  inv,
  EVENT,
  queue,
  dealDamage,
  endScenario,
} from "../../../../src/engine/api";
import { experimentStep } from "./02043";

export default {
  abilities: [{ kind: "revelation", run: "back" }],
  hooks: {
    doomThreshold(game: GameContext) {
      for (const c of allCards(game)) if (c.doom) setCounter(game, c.id, "doom", 0);
      emit(game, EVENT.Doom, "All doom in play is removed");
      experimentStep(game);
      return true;
    },
  },
  fns: {
    back(game: GameContext) {
      queue(
        game,
        ...turnOrder(game)
          .filter((i) => inv(game, i).status === "playing")
          .map((i) => dealDamage({ inv: i, damage: 0, horror: 3, direct: false, source: null })),
        endScenario({ id: "R4" }),
      );
    },
  },
} satisfies CardScript;
