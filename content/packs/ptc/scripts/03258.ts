// Catacombs Docent (The Pallid Mask) — spawns at the nearest unrevealed location (its data). [action] Parley: test
// [intellect] (4) to interpret the guide's ravings; a success looks at the revealed side of a Catacombs in play. (Group
// limit once per game.)
import { type CardScript } from "../../../../src/engine/api";
import { peek } from "../../../campaigns/the-path-to-carcosa/scripts/the-pallid-mask";

export default {
  abilities: [
    {
      kind: "action",
      designator: "parley",
      usableBy: "atLocation",
      label: "Catacombs Docent: parley (intellect 4) to look at a Catacombs' revealed side",
      limit: { per: "game", count: 1, group: true },
      effects: [
        {
          op: "skillTest",
          skill: "intellect",
          difficulty: 4,
          onSuccess: [{ op: "script", fn: "peek" }],
        },
      ],
    },
  ],
  fns: { peek },
} satisfies CardScript;
