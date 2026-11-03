// The Midnight Masks: Your House redirects the Ghoul Priest; 6 unique Cultists in the victory display advance the act
import {
  card,
  cardIf,
  type CardScript,
  cardsIn,
  currentAct,
  def,
  findByCode,
  type GameContext,
  push,
  ZONE,
  STEP,
  type InstId,
} from "../../../../src/engine/api";

export default {
  hooks: {
    /** the Ghoul Priest spawns at Your House */
    spawnRedirect(game: GameContext, enemy: InstId) {
      if (card(game, enemy).code !== "01116") return null;
      return findByCode(game, "01124", [ZONE.Location])?.id ?? null;
    },
    checkObjectives(game: GameContext) {
      if (cardIf(game, currentAct(game))?.code !== "01123") return;
      const cultists = new Set(
        cardsIn(game, ZONE.Victory)
          .filter((c) => def(game, c.id).unique && def(game, c.id).traits.includes("Cultist"))
          .map((c) => c.code),
      );
      if (cultists.size >= 6) push(game, { t: STEP.AdvanceAct });
    },
  },
} satisfies CardScript;
