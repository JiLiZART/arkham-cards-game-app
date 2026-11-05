// A Tear in Reality (The Essex County Express, agenda 1) — back: the leftmost car is removed from the game (to the victory
// display with Victory X and no clues), its investigators defeated, its enemies and assets discarded; every clue the
// investigators control is discarded. Agendas 2–4 remove one or two cars the same way
import {
  type CardScript,
  type GameContext,
  setCounter,
  turnOrder,
  queue,
  removeLocation,
} from "../../../../src/engine/api";
import { train } from "../../../campaigns/the-dunwich-legacy/scripts/essex-county-express";

/** the back of the first four agendas: the `n` leftmost cars leave the game, and the investigators' clues are discarded */
export function keepMoving(n: number): CardScript {
  return {
    abilities: [{ kind: "revelation", run: "back" }],
    fns: {
      back(game: GameContext) {
        for (const i of turnOrder(game)) setCounter(game, i, "clues", 0);
        queue(
          game,
          ...train(game)
            .slice(0, n)
            .map((location) => removeLocation({ location, outOfGame: true })),
        );
      },
    },
  };
}

export default keepMoving(1);
