// Horrors Unleashed (Undimensioned and Unseen, agenda 3) — each Abomination enemy gets +1 fight and +1 evade; its forced
// "each Brood moves toward a random location" is in cards.json; back: (→R1)
import { type CardScript, def, enemies, type GameContext } from "../../../../src/engine/api";
import { SHARED } from "../../../campaigns/the-dunwich-legacy/scripts/undimensioned-and-unseen";

export default {
  abilities: [{ kind: "revelation", effects: [{ op: "resolution", id: "R1" }] }],
  fns: SHARED.fns,
  modifiers: (game: GameContext) =>
    enemies(game)
      .filter((e) => def(game, e.id).traits.includes("Abomination"))
      .flatMap((e) => [
        { target: e.id, mod: { stat: "fight" as const, value: 1 } },
        { target: e.id, mod: { stat: "evade" as const, value: 1 } },
      ]),
} satisfies CardScript;
