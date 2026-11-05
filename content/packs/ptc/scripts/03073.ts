// Gallery (The Last King) — after you end your turn there: test [willpower] (2); a failure places 1 of your clues on it.
import { type CardScript, type EffCtx, type GameContext, inv } from "../../../../src/engine/api";

export default {
  abilities: [
    {
      kind: "forced",
      trigger: "turnEnds",
      condition: { script: "here" },
      effects: [
        {
          op: "skillTest",
          skill: "willpower",
          difficulty: 2,
          onFail: [{ op: "moveClues", amount: 1, from: "you", to: "yourLocation" }],
        },
      ],
    },
  ],
  conditions: {
    here: (game: GameContext, ctx: EffCtx) =>
      !!ctx.inv && inv(game, ctx.inv).location === ctx.source,
  },
} satisfies CardScript;
