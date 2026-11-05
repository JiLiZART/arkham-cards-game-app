// A Tear in Reality (The Essex County Express, agenda 1) — back: the leftmost car is removed from the game (to the victory
// display with Victory X and no clues), its investigators defeated, its enemies and assets discarded; every clue the
// investigators control is discarded. Agendas 2–4 remove one or two cars the same way
import {
  type CardScript,
  findByCode,
  type GameContext,
  leadInvestigator,
  setCounter,
  turnOrder,
  queue,
  removeLocation,
  spawn,
  ZONE,
} from "../../../../src/engine/api";
import { train } from "../../../campaigns/the-dunwich-legacy/scripts/essex-county-express";

/** The Conductor (Return to The Essex County Express), waiting in limbo since the agenda it was attached to advanced */
const CONDUCTOR = "51026b";

/** the back of the first four agendas: the `n` leftmost cars leave the game, and the investigators' clues are discarded */
export function keepMoving(n: number): CardScript {
  return {
    abilities: [{ kind: "revelation", run: "back" }],
    fns: {
      back(game: GameContext) {
        for (const i of turnOrder(game)) setCounter(game, i, "clues", 0);
        // "after you advance the attached agenda, draw The Conductor": it spawns at the new leftmost car
        const conductor = findByCode(game, CONDUCTOR, [ZONE.Limbo]);
        queue(
          game,
          ...train(game)
            .slice(0, n)
            .map((location) => removeLocation({ location, outOfGame: true })),
          ...(conductor ? [spawn({ enemy: conductor.id, inv: leadInvestigator(game) })] : []),
        );
      },
    },
  };
}

export default keepMoving(1);
