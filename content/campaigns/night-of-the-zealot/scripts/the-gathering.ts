// The Gathering: act 3 advances when the Ghoul Priest is defeated
import {
  cardIf,
  type CardScript,
  currentAct,
  flags,
  type GameContext,
  queue,
  advanceAct,
} from "../../../../src/engine/api";

export default {
  hooks: {
    checkObjectives(game: GameContext) {
      if (cardIf(game, currentAct(game))?.code === "01110" && flags.defeated.get(game, "01116"))
        queue(game, advanceAct());
    },
  },
} satisfies CardScript;
