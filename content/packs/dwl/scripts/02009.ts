// Rex's Curse — when Rex would succeed, the token goes back and a new one is revealed; a failure it causes shuffles
// the curse back into his deck (the abilities are in cards.json)
import {
  type CardScript,
  currentTest,
  type GameContext,
  redrawTokens,
} from "../../../../src/engine/api";

export default {
  fns: {
    redraw(game: GameContext) {
      redrawTokens(game);
    },
  },
  conditions: {
    redrawn: (game: GameContext) => !!currentTest(game)?.redrawn,
  },
} satisfies CardScript;
