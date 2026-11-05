// Rehearsal Room (Curtain Call) — after you succeed by 2 or more while investigating it: take 1 horror.
import { type CardScript, type EffCtx, type GameContext, inv } from "../../../../src/engine/api";

export default {
  abilities: [
    {
      kind: "forced",
      trigger: "successfulInvestigate",
      condition: { all: [{ succeededBy: { min: 2 } }, { script: "here" }] },
      effects: [{ op: "takeHorror", amount: 1 }],
    },
  ],
  conditions: {
    here: (game: GameContext, ctx: EffCtx) =>
      !!ctx.inv && inv(game, ctx.inv).location === ctx.source,
  },
} satisfies CardScript;
