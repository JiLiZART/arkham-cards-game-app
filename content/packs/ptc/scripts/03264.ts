// Stick to the Plan — Permanent (it starts in play). Before its owner's opening hand, up to 3 different Tactic and/or
// Supply events from their deck go facedown beneath it, the deck shuffled; they may be played from there as if from the
// hand while it is ready, playing one exhausting it (rules/cards.ts, the play of a card from beneath a card in play)
import {
  card,
  type CardScript,
  cardsBeneath,
  def,
  type GameContext,
  type InstId,
  inv,
  putBeneath,
  queue,
  runScript,
  type ScriptRun,
  shuffleDeck,
} from "../../../../src/engine/api";

const PLAN = "03264";
const MAX = 3;

const fits = (game: GameContext, id: InstId) =>
  def(game, id).type === "event" &&
  (def(game, id).traits.includes("Tactic") || def(game, id).traits.includes("Supply"));

export default {
  beforeOpeningHand: { fn: "attach" },
  extraPlayable(game: GameContext, cardId: InstId) {
    return card(game, cardId).exhausted ? [] : [...cardsBeneath(game, cardId)];
  },
  fns: {
    /** one event a step, a different title each, until the player is done or 3 are attached; then the deck is shuffled */
    attach(game: GameContext, run: ScriptRun) {
      const under = cardsBeneath(game, run.source);
      const titles = new Set(under.map((id) => def(game, id).name));
      const deck = inv(game, run.you).deck;
      // one copy of each title is offered
      const choices =
        under.length < MAX
          ? deck.filter(
              (id, k) =>
                fits(game, id) &&
                !titles.has(def(game, id).name) &&
                deck.findIndex((x) => def(game, x).name === def(game, id).name) === k,
            )
          : [];
      if (choices.length) {
        const pick = run.choose<string>(
          [
            { id: "done", label: "Done", value: "done", key: "option.done" },
            ...choices.map((id) => ({ id, label: def(game, id).name, card: id, value: id })),
          ],
          { text: "Stick to the Plan: choose an event to attach", key: "stickToThePlan" },
          { auto: false, shown: deck.filter((id) => fits(game, id)) },
        );
        if (pick !== "done") {
          putBeneath(game, pick, run.source);
          queue(game, runScript({ code: PLAN, fn: "attach", ctx: run.ctx }));
          return;
        }
      }
      shuffleDeck(game, run.you);
    },
  },
} satisfies CardScript;
