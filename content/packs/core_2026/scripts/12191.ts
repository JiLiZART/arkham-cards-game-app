// Unnatural Decay — 1 doom on an asset you control
import {
  controlled,
  type CardScript,
  type GameContext,
  type ScriptRun,
  queue,
  placeDoom,
  checkDoom,
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
      queue(game, placeDoom({ card: pick, n: 1 }), checkDoom());
    },
  },
} satisfies CardScript;
