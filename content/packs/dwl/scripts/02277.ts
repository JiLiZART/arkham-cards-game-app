// The Path to the Hill (Where Doom Awaits, act 1) — its objective (the clues spent at once) is the scenario's
// checkObjectives; back: all clues off each location in play, and Ascending Path revealed (by name: Return to Where
// Doom Awaits plays its Warped and Twisted version)
import {
  type CardScript,
  type GameContext,
  locationByName,
  locations,
  queue,
  revealLocation,
  setCounter,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "back" }],
  fns: {
    back(game: GameContext) {
      for (const l of locations(game)) setCounter(game, l.id, "clues", 0);
      const path = locationByName(game, "Ascending Path");
      if (path) queue(game, revealLocation(path.id));
    },
  },
} satisfies CardScript;
