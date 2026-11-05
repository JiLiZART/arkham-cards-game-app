// Searching for the Tome (The Miskatonic Museum, act 3) — objective: no clues left in the Restricted Hall (the scenario's
// checkObjectives); back: the investigators decide what becomes of the Necronomicon: destroy it (→R1) or keep it (→R2)
import {
  type CardScript,
  type GameContext,
  leadInvestigator,
  type ScriptRun,
  queue,
  endScenario,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "back" }],
  fns: {
    back(game: GameContext, run: ScriptRun) {
      const id = run.choose<string>(
        [
          {
            id: "R1",
            label: "It's too dangerous to keep around. We must destroy it.",
            value: "R1",
            key: "option.destroyNecronomicon",
          },
          {
            id: "R2",
            label: "It's too valuable to destroy. We must keep it safe.",
            value: "R2",
            key: "option.keepNecronomicon",
          },
        ],
        {
          text: "The investigators must decide what becomes of the Necronomicon",
          key: "necronomicon",
        },
        { auto: false, who: leadInvestigator(game) },
      );
      queue(game, endScenario({ id }));
    },
  },
} satisfies CardScript;
