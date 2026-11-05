// Tomb of Shadows (The Pallid Mask) — Forced: when it is revealed, act 1 advances. While The Man in the Pallid Mask is
// there he gets +1 health per investigator and his [action] can't defeat him (03059's script reads `strangerShielded`).
import {
  card,
  cardIf,
  type CardScript,
  currentAct,
  enemies,
  type GameContext,
  type InstId,
  playerCount,
  queue,
  advanceAct,
} from "../../../../src/engine/api";
import { MITPM, TOMB } from "../../../campaigns/the-path-to-carcosa/scripts/the-pallid-mask";

const THROUGH_THE_CATACOMBS = "03243";

/** The Man in the Pallid Mask is at the Tomb of Shadows */
export const strangerShielded = (game: GameContext, him: InstId) => {
  const at = card(game, him).location;
  return !!at && cardIf(game, at)?.code === TOMB;
};

export default {
  abilities: [{ kind: "forced", trigger: "revealed", run: "tomb" }],
  modifiers(game: GameContext, self: InstId) {
    if (!card(game, self).revealed) return [];
    return enemies(game)
      .filter((e) => e.code === MITPM && e.location === self)
      .map((e) => ({
        target: e.id,
        mod: { stat: "enemyHealth" as const, value: playerCount(game) },
      }));
  },
  fns: {
    tomb(game: GameContext) {
      if (cardIf(game, currentAct(game))?.code === THROUGH_THE_CATACOMBS)
        queue(game, advanceAct({ by: "objective" }));
    },
  },
} satisfies CardScript;
