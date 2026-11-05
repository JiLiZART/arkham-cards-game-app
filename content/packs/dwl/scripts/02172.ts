// Sleeping Car — unrevealed: it can't be entered while the location to its left has clues; [action]: gain 3 resources,
// remembering you "stole a passenger's luggage" (group limit once per game)
import {
  type CardScript,
  flags,
  type GameContext,
  type ScriptRun,
} from "../../../../src/engine/api";
import { lockedBehind } from "../../../campaigns/the-dunwich-legacy/scripts/essex-county-express";

export default {
  modifiers: lockedBehind,
  abilities: [
    {
      kind: "action",
      label: "Sleeping Car: gain 3 resources",
      limit: { per: "game", count: 1, group: true },
      effects: [
        { op: "gainResources", amount: 3 },
        { op: "script", fn: "luggage" },
      ],
    },
  ],
  fns: {
    luggage(game: GameContext, run: ScriptRun) {
      flags.remembered.set(game, ["stolenLuggage", run.you], true);
    },
  },
} satisfies CardScript;
