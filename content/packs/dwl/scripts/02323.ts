// Yog-Sothoth (Lost in Time and Space) — its health and no attacks of opportunity are in cards.json, its printed evade
// "–" keeps it from being evaded; reaction when it attacks you: discard the top X cards of your deck instead of taking up
// to X horror, then an empty deck drives you insane
import { type CardScript } from "../../../../src/engine/api";
import {
  SHARED,
  yogDiscards,
  yogInsane,
} from "../../../campaigns/the-dunwich-legacy/scripts/lost-in-time-and-space";

export default {
  abilities: [
    {
      kind: "reaction",
      trigger: "attackDealsDamage",
      usableBy: "anyone",
      condition: { eventInvestigatorIsYou: true },
      label: "Yog-Sothoth: discard the top X cards of your deck instead of taking up to X horror",
      run: "yogDiscards",
    },
  ],
  fns: { ...SHARED.fns, yogDiscards, yogInsane },
} satisfies CardScript;
