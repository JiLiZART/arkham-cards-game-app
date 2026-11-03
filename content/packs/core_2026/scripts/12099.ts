// The Nameless Lurker — when the investigation phase ends, if it is ready with no doom: 1 doom on it
import {
  cardIf,
  type CardScript,
  currentPhase,
  type GameContext,
  type ScriptRun,
  queue,
  placeDoom,
} from "../../../../src/engine/api";

export default {
  fns: {
    lurk(game: GameContext, run: ScriptRun) {
      const e = cardIf(game, run.source);
      if (
        currentPhase(game) === "investigation" &&
        e?.zone === "enemy" &&
        !e.exhausted &&
        e.doom === 0
      )
        queue(game, placeDoom({ card: e.id, n: 1 }));
    },
  },
} satisfies CardScript;
