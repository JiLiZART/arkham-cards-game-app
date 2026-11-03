// Trish Scarborough — elder sign: after the test, you may disengage and move to a connecting location
import {
  type CardScript,
  type GameContext,
  type ScriptRun,
  queue,
  resolveEffects,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "elderSign", tokenValue: 0, run: "elder" }],
  fns: {
    elder(game: GameContext, run: ScriptRun) {
      queue(
        game,
        resolveEffects({
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
          ctx: { you: run.ctx.you, source: run.ctx.source },
        }),
      );
    },
  },
} satisfies CardScript;
