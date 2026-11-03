// Graveyard — failing its test may move you to Rivertown
import {
  locationByName,
  type CardScript,
  type GameContext,
  type ScriptRun,
  queue,
  moveInvestigator,
} from "../../../../src/engine/api";

export default {
  fns: {
    moveToRivertown(game: GameContext, run: ScriptRun) {
      const r = locationByName(game, "Rivertown");
      if (r) queue(game, moveInvestigator({ inv: run.you, to: r.id }));
    },
  },
} satisfies CardScript;
