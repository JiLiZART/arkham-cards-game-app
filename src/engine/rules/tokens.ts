import type { TokenEffect } from "../../content/schema";
import {
  allCards,
  card,
  cardsBeneath,
  currentAct,
  currentAgenda,
  def,
  type GameContext,
  inv,
} from "../context";

/** how many cards lie beneath a card (none: 0) */
const beneathOf = (game: GameContext, holder: string | null) =>
  holder ? cardsBeneath(game, holder).length : 0;
import { cardsIn, enemies, enemiesAt, locations } from "../queries";
import type { InvId } from "../world/types";
import { SCENARIO_CARD, ZONE } from "../world/constants";

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
        ).length + beneathOf(game, currentAct(game))
      );
    case "beneathAct":
      return beneathOf(game, currentAct(game));
    case "beneathAgenda":
      return beneathOf(game, currentAgenda(game));
    case "beneathScenario":
      return beneathOf(game, SCENARIO_CARD);
    case "locationsWithoutCardBeneath":
      return locations(game).filter((l) => !cardsBeneath(game, l.id).length).length;
    case "tokensOn":
      return 0; // read with the line's `xTokens` (rules/skillTest.ts)
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
