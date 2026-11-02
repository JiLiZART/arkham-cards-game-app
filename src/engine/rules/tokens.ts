import { underAct } from "../world/flags";
import type { TokenEffect } from "../../content/schema";
import { allCards, card, currentAct, def, type GameContext, inv } from "../context";
import { cardsIn, enemies, enemiesAt } from "../queries";
import type { InvId } from "../world/types";
import { ZONE } from "../world/constants";

/** X values used by scenario reference cards */
export function tokenX(game: GameContext, x: NonNullable<TokenEffect["x"]>, i: InvId): number {
  switch (x) {
    case "ghoulsAtYourLocation":
      return enemiesAt(game, inv(game, i).location).filter((e) =>
        def(game, e.id).traits.includes("Ghoul"),
      ).length;
    case "highestDoomOnCultist":
      return Math.max(
        0,
        ...enemies(game)
          .filter((e) => def(game, e.id).traits.includes("Cultist"))
          .map((e) => e.doom),
      );
    case "monstersInPlay":
      return enemies(game).filter((e) => def(game, e.id).traits.includes("Monster")).length;
    case "totalDoomInPlay":
      return allCards(game)
        .filter((c) => c.zone !== "removed")
        .reduce((n, c) => n + c.doom, 0);
    case "actStage":
      return currentAct(game) ? (def(game, currentAct(game)!).stage ?? 0) : 0;
    case "elitesInVictoryOrUnderAct":
      return (
        cardsIn(game, ZONE.Victory).filter(
          (c) => def(game, c.id).type === "enemy" && def(game, c.id).traits.includes("Elite"),
        ).length + (underAct.get(game) ?? []).length
      );
    case "cluesYouControl":
      return inv(game, i).clues;
    case "fireInPlay":
      return [...cardsIn(game, ZONE.Attached), ...cardsIn(game, ZONE.Threat)].filter(
        (c) => def(game, c.id).name === "Fire!",
      ).length;
    case "atRitualSite": {
      const loc = inv(game, i).location;
      return loc && card(game, loc) && def(game, loc).traits.includes("Ritual Site") ? 1 : 0;
    }
  }
}
