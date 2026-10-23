import type { TokenEffect } from "../../content/schema";
import { def, enemies, enemiesAt, inv, type G } from "../core";
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
  }
}
