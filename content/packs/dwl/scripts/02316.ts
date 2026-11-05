// Out of this World (Lost in Time and Space, act 1) — its action is in cards.json (the scenario's `litasExplore`); back:
// the set-aside The Edge of the Universe into play
import {
  type CardScript,
  def,
  emit,
  EVENT,
  findByCode,
  type GameContext,
  moveCard,
  ZONE,
} from "../../../../src/engine/api";
import { EDGE, SHARED } from "../../../campaigns/the-dunwich-legacy/scripts/lost-in-time-and-space";

/** a set-aside location of this code into play */
export function putAside(game: GameContext, code: string) {
  const loc = findByCode(game, code, [ZONE.SetAside])?.id;
  if (!loc) return;
  moveCard(game, loc, ZONE.Location);
  emit(game, EVENT.Location, `${def(game, loc).name} is put into play`, { card: loc });
}

export default {
  abilities: [{ kind: "revelation", run: "back" }],
  fns: {
    ...SHARED.fns,
    back(game: GameContext) {
      putAside(game, EDGE);
    },
  },
} satisfies CardScript;
