import type { TokenEffect } from "../../content/schema";
import {
  allCards,
  card,
  cardsBeneath,
  currentAct,
  currentAgenda,
  currentAgendas,
  def,
  type GameContext,
  inv,
  pile,
} from "../context";

/** the doom on each agenda in play, one entry per agenda deck */
const agendaDoom = (game: GameContext) =>
  Object.values(currentAgendas(game)).flatMap((id) => (id ? [card(game, id).doom] : []));

/** how many cards lie beneath a card (none: 0) */
const beneathOf = (game: GameContext, holder: string | null) =>
  holder ? cardsBeneath(game, holder).length : 0;
import {
  cardsIn,
  distances,
  enemies,
  enemiesAt,
  locations,
  shroud,
  vengeanceInVictory,
} from "../queries";
import type { InvId } from "../world/types";
import { PILE, SCENARIO_CARD, ZONE } from "../world/constants";
import { scenarioCounter, startLocation } from "../world/flags";

/** X values used by scenario reference cards */
export function tokenX(
  game: GameContext,
  x: NonNullable<TokenEffect["x"]>,
  i: InvId,
  counter?: string,
): number {
  switch (x) {
    case "locationsInPlay":
      return locations(game).length;
    case "locationsWithDoom":
      return locations(game).filter((l) => l.doom > 0).length;
    case "doomOnLocations":
      return locations(game).reduce((n, l) => n + l.doom, 0);
    case "scenarioCounter":
      return counter ? (scenarioCounter.get(game, counter) ?? 0) : 0;
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
    case "broodInPlay":
      return enemies(game).filter((e) => def(game, e.id).name === "Brood of Yog-Sothoth").length;
    case "explorationDeckSize":
      return pile(game, PILE.Exploration).length;
    case "vengeanceInVictory":
      return vengeanceInVictory(game);
    case "extradimensionalLocations":
      return locations(game).filter((l) => def(game, l.id).traits.includes("Extradimensional"))
        .length;
    case "yourLocationShroud": {
      const loc = inv(game, i).location;
      const n = loc ? shroud(game, loc) : 0;
      return Number.isFinite(n) ? n : 0;
    }
    case "horrorOnYou":
      return inv(game, i).horror;
    case "baseShroudOfYourLocation": {
      const loc = inv(game, i).location;
      return (loc && def(game, loc).shroud) || 0;
    }
    case "highestDoomOnEnemy":
      return Math.max(0, ...enemies(game).map((e) => e.doom));
    case "doomOnEnemies":
      return enemies(game).reduce((n, e) => n + e.doom, 0);
    case "highestDoomOnAgenda":
      return Math.max(0, ...agendaDoom(game));
    case "doomOnAgendas":
      return agendaDoom(game).reduce((n, d) => n + d, 0);
    case "distanceFromStart": {
      const from = startLocation.get(game);
      const loc = inv(game, i).location;
      return (from && loc && distances(game, from).get(loc)) || 0;
    }
    case "monstersInPlay":
      return enemies(game).filter((e) => def(game, e.id).traits.includes("Monster")).length;
    case "totalDoomInPlay":
      return allCards(game)
        .filter((c) => c.zone !== "removed")
        .reduce((n, c) => n + c.doom, 0);
    case "actStage":
      return currentAct(game) ? (def(game, currentAct(game)!).stage ?? 0) : 0;
    case "agendaStage":
      return currentAgenda(game) ? (def(game, currentAgenda(game)!).stage ?? 0) : 0;
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
    case "discardedPrintedCost":
      return 0; // read with the line's `xTokens`, or from the test's discards (rules/skillTest.ts)
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
