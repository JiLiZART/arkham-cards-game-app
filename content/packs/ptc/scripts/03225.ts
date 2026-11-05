// Torturous Chords (A Phantom of Truth) — test [willpower] (5); a failure puts it in your threat area with 1 resource on
// it per point failed. Each card you play costs 1 more and takes 1 resource off it; with none left it is discarded.
import {
  addCounter,
  card,
  type CardScript,
  discard,
  emit,
  type GameContext,
  type ScriptRun,
  setCounter,
  EVENT,
} from "../../../../src/engine/api";

export default {
  abilities: [
    {
      kind: "revelation",
      effects: [
        {
          op: "skillTest",
          skill: "willpower",
          difficulty: 5,
          onFail: [{ op: "putInThreatArea" }, { op: "script", fn: "chords" }],
        },
      ],
    },
    { kind: "constant", modifiers: [{ stat: "cost", value: 1, scope: "controller" }] },
    {
      kind: "forced",
      trigger: "cardPlayed",
      condition: { eventInvestigatorIsYou: true },
      run: "played",
    },
  ],
  fns: {
    chords(game: GameContext, run: ScriptRun) {
      const n = run.ctx.failBy ?? 0;
      setCounter(game, run.source, "resources", n);
      if (!n) discard(game, run.source);
    },
    played(game: GameContext, run: ScriptRun) {
      const left = addCounter(game, run.source, "resources", -1);
      emit(game, EVENT.Resource, "1 resource leaves Torturous Chords", { card: run.source });
      if (left <= 0 && card(game, run.source).zone === "threat") discard(game, run.source);
    },
  },
} satisfies CardScript;
