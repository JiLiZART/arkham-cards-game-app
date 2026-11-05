// Engineer (Return to The Essex County Express, story asset) — parley succeeds: whoever doesn't control him takes control,
// his controller discovers 1 clue at their location instead. Defeated, he isn't discarded: healed, uncontrolled and
// exhausted, he stays where he is
import {
  card,
  type CardScript,
  type GameContext,
  inv,
  moveCard,
  queue,
  resolveEffect,
  type ScriptRun,
  exhaust,
  setController,
  setCounter,
  ZONE,
} from "../../../../src/engine/api";

export default {
  fns: {
    parley(game: GameContext, run: ScriptRun) {
      const mine = card(game, run.source).controller === run.you;
      queue(
        game,
        resolveEffect({
          effect: mine ? { op: "discoverClues", amount: 1 } : { op: "takeControl" },
          ctx: { ...run.ctx, you: run.you },
        }),
      );
    },
    /** "When Engineer would be discarded: instead, heal all damage and horror from it, lose control of it, and exhaust it" */
    kept(game: GameContext, run: ScriptRun) {
      const c = card(game, run.source);
      if (c.zone !== ZONE.Play || !c.controller) return;
      const at = inv(game, c.controller).location;
      moveCard(game, run.source, ZONE.Attached, { location: at });
      setController(game, run.source, null);
      setCounter(game, run.source, "damage", 0);
      setCounter(game, run.source, "horror", 0);
      exhaust(game, run.source);
    },
  },
} satisfies CardScript;
