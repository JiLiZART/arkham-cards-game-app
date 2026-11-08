// Shocking Display (Return to The Last King, set aside until agenda 1b shuffles it in) — Revelation: one of the
// Sickening Reality cards beneath the scenario reference card, at random, is resolved. Cannot be canceled (nothing here
// cancels it).
import {
  allCards,
  type CardScript,
  cardsBeneath,
  type GameContext,
  queue,
  randomInt,
  resolveStory,
  type ScriptRun,
  ZONE,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "display" }],
  fns: {
    display(game: GameContext, run: ScriptRun) {
      const scenario = allCards(game).find((c) => c.zone === ZONE.Scenario);
      const pile = scenario ? [...cardsBeneath(game, scenario.id)] : [];
      if (pile.length)
        queue(game, resolveStory({ card: pile[randomInt(game, pile.length)], you: run.you }));
    },
  },
} satisfies CardScript;
