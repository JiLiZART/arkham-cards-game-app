// Seeker of Carcosa — Spawn: any empty Historical Society location (its data). Aloof. At the end of the mythos phase
// 1 clue moves from its location onto it; with none there, 1 doom is placed on it instead.
import {
  card,
  type CardScript,
  type GameContext,
  type ScriptRun,
  queue,
  placeDoom,
  resolveEffect,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "forced", trigger: "mythosEnds", run: "seek" }],
  fns: {
    seek(game: GameContext, run: ScriptRun) {
      const me = card(game, run.source);
      if (me.location && card(game, me.location).clues > 0)
        queue(
          game,
          resolveEffect({
            effect: { op: "moveClues", amount: 1, from: "selfLocation", to: "self" },
            ctx: { ...run.ctx, you: run.you, source: me.id },
          }),
        );
      else queue(game, placeDoom({ card: me.id, n: 1 }));
    },
  },
} satisfies CardScript;
