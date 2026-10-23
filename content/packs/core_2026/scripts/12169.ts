// A Gathering — each enemy at a location with Fire! attached cannot be damaged
import { cardsIn, type CardScript, type G } from "../../../../src/engine/api";

export const fireShield = (g: G) =>
  cardsIn(g, "enemy")
    .filter((e) =>
      cardsIn(g, "attached").some((f) => f.code === "12129" && f.location === e.location),
    )
    .map((e) => ({ target: e.id, mod: { flag: "cannotBeDamaged" as const } }));

export default { modifiers: fireShield } satisfies CardScript;
