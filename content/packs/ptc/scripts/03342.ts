// Possession (Murderous) (Dim Carcosa): peril, hidden (data); kills past twice your sanity (03340). [action] Deal 2
// damage to an investigator at your location (yourself included): discard it from your hand.
import type { CardScript } from "../../../../src/engine/api";
import { possession } from "./03340";

export default {
  ...possession,
  abilities: [
    ...possession.abilities,
    {
      kind: "action",
      label:
        "Possession (Murderous): deal 2 damage to an investigator at your location to discard it",
      effects: [{ op: "takeDamage", amount: 2, target: "chooseAtLocation" }, { op: "discardSelf" }],
    },
  ],
} satisfies CardScript;
