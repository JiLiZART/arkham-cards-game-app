// Tomb of Shadows (The Pallid Mask) — Forced: when it is revealed, act 1 advances. While The Man in the Pallid Mask is
// there he gets +1 health per investigator and his [action] can't defeat him (03059's script reads `strangerShielded`);
// in Return to The Pallid Mask he cannot leave it during act 2.
import {
  card,
  cardIf,
  type CardScript,
  currentAct,
  enemies,
  flags,
  type GameContext,
  type InstId,
  playerCount,
  queue,
  advanceAct,
} from "../../../../src/engine/api";
import {
  MITPM,
  RETURN_RULES,
  TOMB,
} from "../../../campaigns/the-path-to-carcosa/scripts/the-pallid-mask";

const THROUGH_THE_CATACOMBS = "03243";
const THE_PATH_IS_BARRED = "03244";

/** The Man in the Pallid Mask is at the Tomb of Shadows */
export const strangerShielded = (game: GameContext, him: InstId) => {
  const at = card(game, him).location;
  return !!at && cardIf(game, at)?.code === TOMB;
};

export default {
  abilities: [{ kind: "forced", trigger: "revealed", run: "tomb" }],
  modifiers(game: GameContext, self: InstId) {
    if (!card(game, self).revealed) return [];
    // Return to The Pallid Mask: "While it is act 2, The Man in the Pallid Mask cannot leave the Tomb of Shadows"
    const held =
      !!flags.named(game, RETURN_RULES) &&
      cardIf(game, currentAct(game))?.code === THE_PATH_IS_BARRED;
    return enemies(game)
      .filter((e) => e.code === MITPM && e.location === self)
      .flatMap((e) => [
        { target: e.id, mod: { stat: "enemyHealth" as const, value: playerCount(game) } },
        ...(held ? [{ target: e.id, mod: { flag: "cannotMove" as const } }] : []),
      ]);
  },
  fns: {
    tomb(game: GameContext) {
      if (cardIf(game, currentAct(game))?.code === THROUGH_THE_CATACOMBS)
        queue(game, advanceAct({ by: "objective" }));
    },
  },
} satisfies CardScript;
