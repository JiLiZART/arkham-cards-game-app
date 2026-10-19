import type { GameState } from "../engine/types";
import { db } from "./context";

/**
 * A phase with nothing to show: its pause (the title and the lead's continue) is skipped. Only the enemy phase can be:
 * when no enemy in play is ready and either engaged (it attacks) or a hunter (it moves). The phase itself still runs.
 */
export function phaseIsEmpty(game: GameState, phase: string): boolean {
  if (phase !== "enemy") return false;
  return !Object.values(game.cards).some((c) => c.zone === "enemy" && !c.exhausted && (c.engagedWith || db.cards[c.code]?.keywords.includes("hunter")));
}
