// The Oath (Echoes of the Past, act 3) — the Passageways connected to one another (the scenario's `connections`); only
// investigators in the Hidden Library may spend the clues (its data: `actSpendAt`). Back: the investigators decide,
// the lead for the group: take the clasp (→R1) or leave it (→R2).
import {
  type CardScript,
  type GameContext,
  type ScriptRun,
  queue,
  endScenario,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "theClasp" }],
  fns: {
    theClasp(game: GameContext, run: ScriptRun) {
      const id = run.choose<string>(
        [
          {
            id: "R1",
            label: "This is an important discovery! We should take it with us. (→R1)",
            value: "R1",
            key: "option.eotpTakeClasp",
          },
          {
            id: "R2",
            label: "It's just a silly trinket. Leave it behind. (→R2)",
            value: "R2",
            key: "option.eotpLeaveClasp",
          },
        ],
        { text: "The investigators must decide", key: "eotpTheClasp" },
        { auto: false },
      );
      queue(game, endScenario({ id }));
    },
  },
} satisfies CardScript;
