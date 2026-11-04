// Mind Wipe (level 3) — as the core Mind Wipe, and the enemy's damage and horror are 1 lower until the phase ends
import type { CardScript, GameContext, ScriptRun } from "../../../../src/engine/api";
import { wipe } from "../../core/scripts/01068";

export default {
  fns: {
    wipe(game: GameContext, run: ScriptRun) {
      wipe(game, run, [
        { stat: "enemyDamage", value: -1 },
        { stat: "enemyHorror", value: -1 },
      ]);
    },
  },
} satisfies CardScript;
