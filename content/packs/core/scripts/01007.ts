// Cover Up — discard clues from Cover Up instead of discovering them; trauma if clues remain at game end
import {
  addCounter,
  cancelEvent,
  card,
  type CardScript,
  type EffCtx,
  emit,
  type GameContext,
  EVENT,
} from "../../../../src/engine/api";

export default {
  abilities: [
    {
      kind: "reaction",
      trigger: "wouldDiscoverClues",
      label: "Cover Up: remove clues from Cover Up instead",
      condition: { selfHasClues: true },
      run: "coverUp",
    },
  ],
  fns: {
    coverUp(game: GameContext, ctx: EffCtx) {
      const c = card(game, ctx.source!);
      const n = Math.min(ctx.x ?? 1, c.clues);
      addCounter(game, c.id, "clues", -n);
      if (ctx.key) cancelEvent(game, ctx.key);
      emit(game, EVENT.CoverUp, `${n} clue(s) are discarded from Cover Up (${c.clues} left)`, {
        card: c.id,
        data: { n },
      });
    },
  },
  hooks: {
    gameEnd(game: GameContext, ctx: EffCtx) {
      const c = card(game, ctx.source!);
      if (c.clues > 0 && c.controller) addCounter(game, c.controller, "mentalTrauma", 1);
    },
  },
} satisfies CardScript;
