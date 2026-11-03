// Unnatural Decay — 1 doom on an asset you control
import {
  controlled,
  push,
  type CardScript,
  type GameContext,
  STEP,
  type ScriptRun,
} from "../../../../src/engine/api";

export default {
  fns: {
    decay(game: GameContext, run: ScriptRun) {
      const assets = controlled(game, run.you);
      if (!assets.length) return;
      const pick = run.chooseCard(
        assets.map((c) => c.id),
        { text: "Unnatural Decay: place 1 doom on an asset", key: "chooseAsset" },
      );
      push(game, { t: STEP.PlaceDoom, card: pick, n: 1 }, { t: STEP.CheckDoom });
    },
  },
} satisfies CardScript;
