import type { GameState, InvId } from "../../engine/types";

export const PHASES = ["mythos", "investigation", "enemy", "upkeep"] as const;

export type PhaseState = "done" | "current" | "todo" | "skipped";
export type TurnState = "active" | "done" | "todo" | "idle";

export interface RibbonModel {
  round: number;
  /** before the first round (setup, mulligan) and after the scenario ended there are no phases to light */
  stage: "setup" | "play" | "ended";
  phases: { id: (typeof PHASES)[number]; state: PhaseState }[];
  turns: { inv: InvId; state: TurnState; pips: number; filled: number }[];
}

/** what the top ribbon shows: the round's phases, and in the investigation phase whose turn it is and the actions left */
export function ribbonModel(game: GameState): RibbonModel {
  const stage = game.phase === "setup" ? "setup" : game.phase === "ended" ? "ended" : "play";
  // a paced game's pause before a phase already belongs to it: its title is on screen
  const pause =
    game.pending?.kind === "phase" ? (game.pending.step as { phase?: string }).phase : undefined;
  const phase = pause ?? game.phase;
  const at = PHASES.indexOf(phase as (typeof PHASES)[number]);
  const phases = PHASES.map((id, k) => ({
    id,
    // round 1 has no mythos phase
    state: (id === "mythos" && game.round === 1
      ? "skipped"
      : at < 0
        ? "todo"
        : k < at
          ? "done"
          : k === at
            ? "current"
            : "todo") as PhaseState,
  }));
  const investigating = phase === "investigation";
  const turns = game.order
    .filter((i) => game.invs[i].status === "playing")
    .map((i) => {
      const st = game.invs[i];
      if (!investigating) return { inv: i, state: "idle" as const, pips: 0, filled: 0 };
      if (game.active === i) {
        const left = st.actionsLeft + st.restrictedActions.reduce((n, r) => n + r.left, 0);
        return { inv: i, state: "active" as const, pips: Math.max(3, left), filled: left };
      }
      // last round's turns are still marked done until the investigation phase begins
      return st.turnDone && pause !== "investigation"
        ? { inv: i, state: "done" as const, pips: 3, filled: 0 }
        : { inv: i, state: "todo" as const, pips: 3, filled: 3 };
    });
  return { round: game.round, stage, phases, turns };
}
