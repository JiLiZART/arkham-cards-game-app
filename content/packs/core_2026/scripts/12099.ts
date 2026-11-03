// The Nameless Lurker — when the investigation phase ends, if it is ready with no doom: 1 doom on it
import {
  cardIf,
  type CardScript,
  currentPhase,
  type GameContext,
  push,
  STEP,
  type ScriptRun,
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
        push(game, { t: STEP.PlaceDoom, card: e.id, n: 1 });
    },
  },
} satisfies CardScript;
