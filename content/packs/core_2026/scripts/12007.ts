// Trish Scarborough — elder sign: after the test, you may disengage and move to a connecting location
import {
  push,
  type CardScript,
  type EffCtx,
  type GameContext,
  STEP,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "elderSign", tokenValue: 0, run: "elder" }],
  fns: {
    elder(game: GameContext, ctx: EffCtx) {
      push(game, {
        t: STEP.Effects,
        effects: [
          {
            op: "chooseOne",
            options: [
              {
                label: "Disengage and move to a connecting location",
                effects: [{ op: "disengageAll" }, { op: "moveTo", where: "connecting" }],
              },
              { label: "Stay", effects: [] },
            ],
          },
        ],
        ctx: { you: ctx.you, source: ctx.source },
      });
    },
  },
} satisfies CardScript;
