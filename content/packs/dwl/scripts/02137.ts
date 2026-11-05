// Exhibit Hall (Restricted Hall) — while Hunting Horror is at this location, it cannot be investigated. Act 2's objective
// (entering it) and act 3's (its clues gone) are the scenario's checkObjectives
import { type CardScript, type GameContext, type InstId } from "../../../../src/engine/api";
import { horrorInPlay } from "./02141";

export default {
  modifiers: (game: GameContext, hall: InstId) =>
    horrorInPlay(game)?.location === hall
      ? [{ target: hall, mod: { flag: "cannotBeInvestigated" as const } }]
      : [],
} satisfies CardScript;
