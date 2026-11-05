// Strange Solution — a success records in the campaign log that "you have identified the solution" (the Researched
// Strange Solutions need it); the test is in cards.json
import { type CardScript, flags, type GameContext } from "../../../../src/engine/api";

export default {
  fns: {
    identified(game: GameContext) {
      flags.logEntry.set(game, ["", "identifiedTheSolution"], true);
    },
  },
} satisfies CardScript;
