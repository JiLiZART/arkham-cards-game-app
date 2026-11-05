// Historical Society (Peabody's Office) — while an investigator at this location controls Mr. Peabody, it gets -2
// shroud.
import {
  allCards,
  card,
  type CardScript,
  type GameContext,
  type InstId,
  inv,
  ZONE,
} from "../../../../src/engine/api";
import { PEABODY } from "../../../campaigns/the-path-to-carcosa/scripts/echoes-of-the-past";

export default {
  modifiers(game: GameContext, cardId: InstId) {
    const him = allCards(game).find((c) => c.code === PEABODY && c.zone === ZONE.Play);
    const here =
      card(game, cardId).revealed &&
      !!him?.controller &&
      inv(game, him.controller).location === cardId;
    return here ? [{ target: cardId, mod: { stat: "shroud" as const, value: -2 } }] : [];
  },
} satisfies CardScript;
