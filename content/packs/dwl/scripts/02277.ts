// The Path to the Hill (Where Doom Awaits, act 1) — its objective (the clues spent at once) is the scenario's
// checkObjectives; back: all clues off each location in play, and Ascending Path revealed
import {
  type CardScript,
  findByCode,
  type GameContext,
  locations,
  queue,
  revealLocation,
  setCounter,
  ZONE,
} from "../../../../src/engine/api";
import { ASCENDING } from "../../../campaigns/the-dunwich-legacy/scripts/where-doom-awaits";

export default {
  abilities: [{ kind: "revelation", run: "back" }],
  fns: {
    back(game: GameContext) {
      for (const l of locations(game)) setCounter(game, l.id, "clues", 0);
      const path = findByCode(game, ASCENDING, [ZONE.Location]);
      if (path) queue(game, revealLocation(path.id));
    },
  },
} satisfies CardScript;
