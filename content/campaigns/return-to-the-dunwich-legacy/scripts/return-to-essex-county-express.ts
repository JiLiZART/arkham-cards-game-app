// Return to The Essex County Express (setup card 51025): the base scenario's script, with the box's rules over it — the
// train built from 10 Train Cars and 4 Engine Cars, and The Conductor (agenda 0's other side) spawning at the leftmost car
// and moving one car right when its car leaves play
import {
  card,
  type CardScript,
  composeScript,
  findByCode,
  type GameContext,
  type InstId,
  setCardLocation,
  setEngaged,
  ZONE,
} from "../../../../src/engine/api";
import base, {
  besides,
  buildTrain,
  ENGINE_CARS,
  train,
  TRAIN_CARS,
} from "../../the-dunwich-legacy/scripts/essex-county-express";

export const CONDUCTOR = "51026b";

/** what the box adds to the base scenario */
const returnTo: CardScript = {
  fns: {
    /** "include the 2 new Train Car locations … for a total of 10", "include the new Engine Car … for a total of 4" */
    train(game: GameContext) {
      buildTrain(game, [...TRAIN_CARS, "51029", "51030"], [...ENGINE_CARS, "51028"]);
    },
  },
  hooks: {
    /** The Conductor's "Spawn - Leftmost location" */
    spawnRedirect(game: GameContext, enemy: InstId) {
      return card(game, enemy).code === CONDUCTOR ? (train(game)[0] ?? null) : undefined;
    },
    /** "When The Conductor's location leaves play: instead of discarding The Conductor, move it one location to the right" */
    locationLeavesPlay(game: GameContext, loc: InstId) {
      const right = besides(game, loc, 1);
      const conductor = findByCode(game, CONDUCTOR, [ZONE.Enemy]);
      if (conductor?.location !== loc || !right) return;
      setEngaged(game, conductor.id, null);
      setCardLocation(game, conductor.id, right);
    },
  },
};

export default composeScript(base, returnTo);
