// Defiance — before the test's chaos tokens are revealed, its committer chooses a symbol; the test ignores that symbol's
// effects, its modifier included
import {
  type CardScript,
  type GameContext,
  ignoreSymbol,
  type ScriptRun,
} from "../../../../src/engine/api";

const SYMBOLS = ["skull", "cultist", "tablet", "elderThing"] as const;

export default {
  abilities: [
    {
      kind: "forced",
      trigger: "wouldRevealToken",
      // whoever's test it is committed to: the committer chooses
      usableBy: "anyone",
      limit: { per: "test", count: 1 },
      effects: [{ op: "script", fn: "defy" }],
    },
  ],
  fns: {
    defy(game: GameContext, run: ScriptRun) {
      const token = run.choose<(typeof SYMBOLS)[number]>(
        SYMBOLS.map((s) => ({ id: s, label: s, value: s, key: `option.symbol.${s}` })),
        { text: "Defiance: choose a symbol to ignore", key: "defiance" },
        { auto: false },
      );
      ignoreSymbol(game, token);
    },
  },
} satisfies CardScript;
