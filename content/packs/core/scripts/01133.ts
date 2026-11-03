// Graveyard — failing its test may move you to Rivertown
import {
  locationByName,
  push,
  type CardScript,
  type GameContext,
  STEP,
  type ScriptRun,
} from "../../../../src/engine/api";

export default {
  fns: {
    moveToRivertown(game: GameContext, run: ScriptRun) {
      const r = locationByName(game, "Rivertown");
      if (r) push(game, { t: STEP.Move, inv: run.you, to: r.id });
    },
  },
} satisfies CardScript;
