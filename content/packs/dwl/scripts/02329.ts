// Interstellar Traveler (Lost in Time and Space) — spawn and Hunter in cards.json; forced when it enters a location: 1 clue
// there flipped to its doom side onto it, or 1 doom on it with no clues there
import {
  addCounter,
  card,
  type CardScript,
  cardIf,
  def,
  emit,
  EVENT,
  type GameContext,
  placeDoom,
  queue,
  removeLocation,
  type ScriptRun,
  ZONE,
} from "../../../../src/engine/api";
import { SHARED } from "../../../campaigns/the-dunwich-legacy/scripts/lost-in-time-and-space";

const CASCADE = "02325";

export default {
  fns: {
    ...SHARED.fns,
    travelerFeeds(game: GameContext, run: ScriptRun) {
      const loc = run.ctx.location ? cardIf(game, run.ctx.location) : undefined;
      if (loc?.zone === ZONE.Location && loc.clues > 0) {
        addCounter(game, loc.id, "clues", -1);
        emit(game, EVENT.Clues, `A clue on ${def(game, loc.id).name} turns to doom`, {
          card: loc.id,
        });
        // Prismatic Cascade: "After the last clue on Prismatic Cascade is removed: Discard Prismatic Cascade"
        if (loc.code === CASCADE && card(game, loc.id).clues === 0) {
          queue(game, placeDoom({ card: run.source, n: 1 }), removeLocation({ location: loc.id }));
          return;
        }
      }
      queue(game, placeDoom({ card: run.source, n: 1 }));
    },
  },
} satisfies CardScript;
