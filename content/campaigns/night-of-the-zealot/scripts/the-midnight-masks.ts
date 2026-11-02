// The Midnight Masks: Your House redirects the Ghoul Priest; 6 unique Cultists in the victory display advance the act
import {
  card,
  cardIf,
  type CardScript,
  cardsIn,
  currentAct,
  def,
  type EffCtx,
  findByCode,
  type GameContext,
  push,
  ZONE,
  STEP,
} from "../../../../src/engine/api";

export default {
  hooks: {
    spawnRedirect(game: GameContext, ctx: EffCtx) {
      if (card(game, ctx.enemy!).code !== "01116") return;
      const house = findByCode(game, "01124", [ZONE.Location]);
      if (house) ctx.location = house.id;
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
