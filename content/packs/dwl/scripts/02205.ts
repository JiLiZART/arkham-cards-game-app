// Burned Ruins (the other copy) — forced, after you fail a test investigating it: 1 of its clues flips to its doom side
import {
  addCounter,
  card,
  type CardScript,
  type GameContext,
  type ScriptRun,
  queue,
  placeDoom,
} from "../../../../src/engine/api";

export default {
  fns: {
    flip(game: GameContext, run: ScriptRun) {
      if (!card(game, run.source).clues) return;
      addCounter(game, run.source, "clues", -1);
      queue(game, placeDoom({ card: run.source, n: 1 }));
    },
  },
} satisfies CardScript;
