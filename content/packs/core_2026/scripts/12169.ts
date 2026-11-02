// A Gathering — each enemy at a location with Fire! attached cannot be damaged
import { cardsIn, type CardScript, type GameContext, ZONE } from "../../../../src/engine/api";

export const fireShield = (game: GameContext) =>
  cardsIn(game, ZONE.Enemy)
    .filter((e) =>
      cardsIn(game, ZONE.Attached).some((f) => f.code === "12129" && f.location === e.location),
    )
    .map((e) => ({ target: e.id, mod: { flag: "cannotBeDamaged" as const } }));

export default { modifiers: fireShield } satisfies CardScript;
