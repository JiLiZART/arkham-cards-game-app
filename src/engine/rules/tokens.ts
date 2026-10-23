import type { TokenEffect } from "../../content/schema";
import { card, cardsIn, def, enemies, enemiesAt, inv, type G } from "../core";
import type { InvId } from "../types";

/** X values used by scenario reference cards */
export function tokenX(g: G, x: NonNullable<TokenEffect["x"]>, i: InvId): number {
  switch (x) {
    case "ghoulsAtYourLocation":
      return enemiesAt(g, inv(g, i).location).filter((e) => def(g, e.id).traits.includes("Ghoul"))
        .length;
    case "highestDoomOnCultist":
      return Math.max(
        0,
        ...enemies(g)
          .filter((e) => def(g, e.id).traits.includes("Cultist"))
          .map((e) => e.doom),
      );
    case "monstersInPlay":
      return enemies(g).filter((e) => def(g, e.id).traits.includes("Monster")).length;
    case "totalDoomInPlay":
      return Object.values(g.s.cards)
        .filter((c) => c.zone !== "removed")
        .reduce((n, c) => n + c.doom, 0);
    case "actStage":
      return g.s.act ? (def(g, g.s.act).stage ?? 0) : 0;
    case "elitesInVictoryOrUnderAct":
      return (
        cardsIn(g, "victory").filter(
          (c) => def(g, c.id).type === "enemy" && def(g, c.id).traits.includes("Elite"),
        ).length + ((g.s.flags.underAct as string[] | undefined) ?? []).length
      );
    case "cluesYouControl":
      return inv(g, i).clues;
    case "fireInPlay":
      return [...cardsIn(g, "attached"), ...cardsIn(g, "threat")].filter(
        (c) => def(g, c.id).name === "Fire!",
      ).length;
    case "atRitualSite": {
      const loc = inv(g, i).location;
      return loc && card(g, loc) && def(g, loc).traits.includes("Ritual Site") ? 1 : 0;
    }
  }
}
