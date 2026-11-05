// Unstable Vortex (Return to Lost in Time and Space) — its abilities are in cards.json; its revelation discards 1 copy
// of Tear Through Space in play, if able (the investigator drawing it chooses which)
import {
  type CardScript,
  type GameContext,
  locations,
  queue,
  removeLocation,
  type ScriptRun,
} from "../../../../src/engine/api";
import { SHARED } from "../../../campaigns/the-dunwich-legacy/scripts/lost-in-time-and-space";

const TEAR_THROUGH_SPACE = "02324";

export default {
  fns: {
    ...SHARED.fns,
    vortexTear(game: GameContext, run: ScriptRun) {
      const tears = locations(game)
        .filter((l) => l.code === TEAR_THROUGH_SPACE)
        .map((l) => l.id);
      if (!tears.length) return;
      const tear = run.chooseCard(tears, {
        text: "Choose a Tear Through Space to discard",
        key: "vortexTear",
      });
      queue(game, removeLocation({ location: tear }));
    },
  },
} satisfies CardScript;
