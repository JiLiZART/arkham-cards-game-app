// Dr. William T. Maleson — the encounter card just drawn is cancelled and shuffled back into the encounter deck, then a
// new one is drawn; the reaction and its costs are in cards.json
import {
  type CardScript,
  cancelEvent,
  type GameContext,
  moveCard,
  resolveEffect,
  queue,
  type ScriptRun,
  shuffleDeck,
  ZONE,
} from "../../../../src/engine/api";

export default {
  fns: {
    redraw(game: GameContext, run: ScriptRun) {
      const drawn = run.ctx.card;
      if (!drawn || !run.ctx.key) return;
      cancelEvent(game, run.ctx.key);
      moveCard(game, drawn, ZONE.EncounterDeck);
      shuffleDeck(game, "encounter");
      queue(game, resolveEffect({ effect: { op: "drawEncounterCard" }, ctx: { you: run.you } }));
    },
  },
} satisfies CardScript;
