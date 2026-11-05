// Clover Club Cardroom — while it is act 1: spend 2 resources to reveal a random chaos token: the elder sign gains 2 clues
// and 2 resources, an even number 2 clues, anything else nothing
import type { CardScript } from "../../../../src/engine/api";
import { actOne } from "./02071";

export default {
  abilities: [
    {
      kind: "action",
      label: "Clover Club Cardroom: spend 2 resources to reveal a chaos token",
      cost: { resources: 2 },
      condition: { script: "actOne" },
      effects: [
        {
          op: "revealToken",
          on: [
            {
              tokens: ["elderSign"],
              effects: [
                { op: "gainClues", amount: 2 },
                { op: "gainResources", amount: 2 },
              ],
            },
            { parity: "even", effects: [{ op: "gainClues", amount: 2 }] },
          ],
        },
      ],
    },
  ],
  conditions: { actOne },
} satisfies CardScript;
