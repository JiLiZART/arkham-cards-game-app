// Courtyard (The Last King) — after you enter it: discard the top card of the encounter deck; an enemy is drawn.
import {
  type CardScript,
  def,
  discardTop,
  type GameContext,
  type ScriptRun,
  queue,
  resolveEffect,
  card,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "forced", trigger: "enterLocation", run: "courtyard" }],
  fns: {
    courtyard(game: GameContext, run: ScriptRun) {
      const [top] = discardTop(game, "encounter", 1);
      if (!top || def(game, top).type !== "enemy") return;
      queue(
        game,
        resolveEffect({
          effect: {
            op: "searchEncounterDraw",
            filter: { code: card(game, top).code },
            zones: ["discard"],
          },
          ctx: { ...run.ctx, you: run.you },
        }),
      );
    },
  },
} satisfies CardScript;
