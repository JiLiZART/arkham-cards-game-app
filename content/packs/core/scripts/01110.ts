// What Have You Done? (The Gathering, act 3) — back: burn it down (R1) or not (R2)
import {
  ask,
  type CardScript,
  type EffCtx,
  type GameContext,
  leadInvestigator,
  push,
  type Step,
  CHOICE,
  STEP,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "back" }],
  fns: {
    back(game: GameContext, _ctx: EffCtx, _args: unknown, step?: Step) {
      const r = ask<string>(
        game,
        step!,
        leadInvestigator(game),
        CHOICE.Generic,
        "Defending the Home — the lead investigator must decide:",
        [
          { id: "R1", label: "It was never much of a home. Burn it down! (→R1)", value: "R1" },
          {
            id: "R2",
            label: "This hell-pit is my home! No way are we burning it! (→R2)",
            value: "R2",
          },
        ],
        { key: "defendingHome" },
      );
      if (r) push(game, { t: STEP.Resolution, id: r });
    },
  },
} satisfies CardScript;
