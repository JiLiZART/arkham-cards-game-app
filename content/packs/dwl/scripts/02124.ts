// Breaking and Entering (The Miskatonic Museum, act 2, after the door was broken down) — objective: an investigator
// enters the Restricted Hall (the scenario's checkObjectives); back: an investigator takes control of Harold Walsted, and
// Hunting Horror is placed ready in the Restricted Hall
import { type CardScript, type GameContext, type ScriptRun } from "../../../../src/engine/api";
import { takeAlly } from "./02122";
import { horrorToRestrictedHall } from "./02123";

export default {
  abilities: [{ kind: "revelation", run: "back" }],
  fns: {
    back(game: GameContext, run: ScriptRun) {
      takeAlly(game, run, "02138");
      horrorToRestrictedHall(game);
    },
  },
} satisfies CardScript;
