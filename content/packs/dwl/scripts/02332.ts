// Wormhole (Lost in Time and Space) — revelation: cards discarded from the top of the encounter deck until a location,
// which resolves its revelation; then you move there (an encounter card's move: the agenda's 1 horror)
import {
  type CardScript,
  type GameContext,
  queue,
  type ScriptRun,
} from "../../../../src/engine/api";
import {
  discardUntilLocation,
  encounterMove,
  revelationOf,
  SHARED,
} from "../../../campaigns/the-dunwich-legacy/scripts/lost-in-time-and-space";

export default {
  abilities: [{ kind: "revelation", run: "wormhole" }],
  fns: {
    ...SHARED.fns,
    wormhole(game: GameContext, run: ScriptRun) {
      const loc = discardUntilLocation(game);
      if (loc)
        queue(game, ...revelationOf(game, loc, run.you), ...encounterMove(game, run.you, loc));
    },
  },
} satisfies CardScript;
