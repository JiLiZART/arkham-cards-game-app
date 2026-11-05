// Possession (Torturous) (Dim Carcosa): peril, hidden (data); kills past twice your sanity (03340). [action] Spend 5
// resources: discard it from your hand.
import type { CardScript } from "../../../../src/engine/api";
import { possession } from "./03340";

export default {
  ...possession,
  abilities: [
    ...possession.abilities,
    {
      kind: "action",
      label: "Possession (Torturous): spend 5 resources to discard it",
      cost: { resources: 5 },
      effects: [{ op: "discardSelf" }],
    },
  ],
} satisfies CardScript;
