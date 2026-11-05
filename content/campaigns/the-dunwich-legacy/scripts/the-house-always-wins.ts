// The House Always Wins: the final act's objective ("each undefeated investigator has resigned") routes by whom the
// resigned took with them — All In (→R2) with Dr. Morgan, Fold (→R3) with Peter Clover, else (→R1); everyone resigned
// or defeated before act 3 is no resolution, which the campaign plays as R1. Agenda 3's back is (→R4). Whoever
// "cheated" (Beginner's Luck) is told to the campaign log as it ends.
import {
  cardIf,
  type CardScript,
  currentAct,
  flags,
  type GameContext,
  inv,
  turnOrder,
  queue,
  endScenario,
} from "../../../../src/engine/api";

/** the final act's version, its story ally and the resolution resigning with them leads to */
const FINAL: Record<string, { ally: string; with: string }> = {
  "02068": { ally: "02080", with: "R2" },
  "02069": { ally: "02079", with: "R3" },
};

export default {
  hooks: {
    allEliminated(game: GameContext) {
      const final = FINAL[cardIf(game, currentAct(game))?.code ?? ""];
      const resigned = turnOrder(game).filter((i) => inv(game, i).status === "resigned");
      if (!final || !resigned.length) {
        queue(game, endScenario({ id: "none" }));
        return;
      }
      const took = resigned.some((i) => flags.resignedWith.get(game, i)?.includes(final.ally));
      queue(game, endScenario({ id: took ? final.with : "R1" }));
    },
    ended(game: GameContext) {
      if (turnOrder(game).some((i) => flags.remembered.get(game, ["cheated", i])))
        flags.logEntry.set(game, ["hidden", "cheated"], true);
    },
  },
} satisfies CardScript;
