// What Have You Done? (The Gathering, act 3) — back: burn it down (R1) or not (R2)
import {
  type CardScript,
  type GameContext,
  leadInvestigator,
  CHOICE,
  type ScriptRun,
  queue,
  endScenario,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "back" }],
  fns: {
    back(game: GameContext, run: ScriptRun) {
      const r = run.choose<string>(
        [
          { id: "R1", label: "It was never much of a home. Burn it down! (→R1)", value: "R1" },
          {
            id: "R2",
            label: "This hell-pit is my home! No way are we burning it! (→R2)",
            value: "R2",
          },
        ],
        { text: "Defending the Home — the lead investigator must decide:", key: "defendingHome" },
        { auto: false, kind: CHOICE.Generic, who: leadInvestigator(game) },
      );
      queue(game, endScenario({ id: r }));
    },
  },
} satisfies CardScript;
