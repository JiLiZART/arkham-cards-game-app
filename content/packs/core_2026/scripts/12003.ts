// In Harm's Way — worn out at 3 damage; 1 physical trauma when the game ends
import {
  addCounter,
  card,
  cardIf,
  type CardScript,
  discard,
  type GameContext,
  type ScriptRun,
  type HookRun,
} from "../../../../src/engine/api";

export default {
  fns: {
    worn(game: GameContext, run: ScriptRun) {
      const c = cardIf(game, run.source);
      if (c?.zone === "threat" && c.damage >= 3) discard(game, c.id);
    },
  },
  hooks: {
    gameEnd(game: GameContext, run: HookRun) {
      const c = card(game, run.source);
      if (c.zone === "threat" && c.controller) addCounter(game, c.controller, "physicalTrauma", 1);
    },
  },
} satisfies CardScript;
