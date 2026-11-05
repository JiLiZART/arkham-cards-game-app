// Fold (The House Always Wins, act 3) — while Peter Clover is controlled by no one, an investigator at his location may
// parley (willpower 3): a clue on him, and with 1 [per_investigator] clues on him they take control of him; when each
// undefeated investigator has resigned, the scenario's script routes to R3 (resigned with him) or R1
import type { CardScript } from "../../../../src/engine/api";
import { parley } from "./02068";

const peter = parley("02079", "Fold: parley with Peter Clover (willpower 3)");

export default {
  abilities: [peter.ability],
  conditions: { near: peter.near },
  fns: { persuade: peter.persuade },
} satisfies CardScript;
