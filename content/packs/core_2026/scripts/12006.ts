// Dead Ends — found by a search of its deck, it is drawn and cancels the search (effects.ts); 2 fewer experience if it is in the hand when the game ends
import {
  card,
  type CardScript,
  flags,
  type GameContext,
  type HookRun,
} from "../../../../src/engine/api";

export default {
  cancelsSearch: true,
  hooks: {
    gameEnd(game: GameContext, run: HookRun) {
      const c = card(game, run.source);
      if (c.zone !== "hand" || !c.owner) return;
      flags.xp.add(game, c.owner, -2);
    },
  },
} satisfies CardScript;
