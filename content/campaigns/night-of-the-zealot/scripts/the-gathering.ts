// The Gathering: act 3 advances when the Ghoul Priest is defeated
import {
  cardIf,
  type CardScript,
  currentAct,
  flags,
  type GameContext,
  push,
  STEP,
} from "../../../../src/engine/api";

export default {
  hooks: {
    checkObjectives(game: GameContext) {
      if (cardIf(game, currentAct(game))?.code === "01110" && flags.defeated.get(game, "01116"))
        push(game, { t: STEP.AdvanceAct });
    },
  },
} satisfies CardScript;
