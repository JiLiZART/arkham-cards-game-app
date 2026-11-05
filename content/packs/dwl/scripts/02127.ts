// Museum Halls — unrevealed: locked (you cannot move in), and the Museum Entrance gains the test to break the door down
// (02126); revealed: investigators here spend 1 [per_investigator] clues, as a group, to put the top card of the
// Exhibit deck into play unrevealed. Its connections to each Exhibit Hall are the scenario's
import {
  type CardScript,
  def,
  emit,
  type EffCtx,
  type GameContext,
  moveCard,
  sideDeck,
  EVENT,
  ZONE,
  type ScriptRun,
} from "../../../../src/engine/api";
import { canSpendHere, locked, spendHere } from "./02052";

/** the Exhibit deck: a side deck of the Exhibit Halls, unrevealed side up (the scenario's setup builds it) */
export const EXHIBIT_DECK = "exhibit";

export default {
  modifiers: locked,
  abilities: [
    {
      kind: "action",
      label:
        "Museum Halls: spend 1 clue per investigator, as a group: the top Exhibit Hall into play",
      usableBy: "atLocation",
      condition: { script: "canOpen" },
      run: "open",
    },
  ],
  conditions: {
    canOpen: (game: GameContext, ctx: EffCtx) =>
      !!ctx.source && sideDeck(game, EXHIBIT_DECK).length > 0 && canSpendHere(game, ctx.source, 1),
  },
  fns: {
    open(game: GameContext, run: ScriptRun) {
      const top = sideDeck(game, EXHIBIT_DECK)[0];
      if (!top) return;
      spendHere(game, run, run.source, 1);
      moveCard(game, top, ZONE.Location);
      emit(game, EVENT.Location, `${def(game, top).name} is put into play`, { card: top });
    },
  },
} satisfies CardScript;
