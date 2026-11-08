// Host of Insanity (Return to The Unspeakable Oath) — Massive, Hunter (its keywords); +2 health per investigator; its
// parley (in its data): with the Clasp of Black Onyx, automatically evade it.
import { type CardScript, type GameContext, playerCount } from "../../../../src/engine/api";

export default {
  modifiers: (game: GameContext, id: string) => [
    { target: id, mod: { stat: "enemyHealth", value: 2 * playerCount(game) } },
  ],
} satisfies CardScript;
