// Security Office (maps) — [action][action]: look at the revealed side of an Exhibit Hall in play, or the top card of the
// Exhibit deck (limit once per turn); with Adam Lynch it costs [action] (02139)
import {
  card,
  type CardScript,
  cardsIn,
  def,
  emit,
  type GameContext,
  type InstId,
  sideDeck,
  asString,
  EVENT,
  ZONE,
  type ScriptRun,
  queue,
  runScript,
} from "../../../../src/engine/api";
import { EXHIBIT_DECK } from "./02127";

/** the Exhibit Halls whose revealed side is hidden: unrevealed in play, and the top of the Exhibit deck */
function hidden(game: GameContext): InstId[] {
  const inPlay = cardsIn(game, ZONE.Location)
    .filter((c) => !c.revealed && def(game, c.id).traits.includes("Exhibit"))
    .map((c) => c.id);
  const top = sideDeck(game, EXHIBIT_DECK)[0];
  return top ? [...inPlay, top] : inPlay;
}

export default {
  abilities: [
    {
      kind: "action",
      actionCost: 2,
      label:
        "Security Office: look at an Exhibit Hall's revealed side, or the top of the Exhibit deck",
      usableBy: "atLocation",
      limit: { per: "turn", count: 1 },
      condition: { script: "canLook" },
      run: "look",
    },
  ],
  conditions: {
    canLook: (game: GameContext) => hidden(game).length > 0,
  },
  fns: {
    look(game: GameContext, run: ScriptRun) {
      const which = run.chooseCard(hidden(game), {
        text: "Choose an Exhibit Hall to look at",
        key: "lookAtExhibit",
      });
      emit(game, EVENT.Look, `Looking at ${def(game, which).name}`, {
        inv: run.you,
        data: { n: 1 },
      });
      // the second choice is its own step: the hall shown until the player is done
      queue(
        game,
        runScript({ code: card(game, run.source).code, fn: "seen", ctx: run.ctx, args: which }),
      );
    },
    seen(game: GameContext, run: ScriptRun) {
      const which = asString(run.args);
      if (!which) return;
      run.choose(
        [{ id: "done", label: "Done", value: "done", key: "option.done" }],
        {
          text: `${def(game, which).name}: ${def(game, which).subname ?? ""}`,
          key: "exhibitSeen",
          vars: { code: card(game, which).code },
        },
        { auto: false, shown: [which] },
      );
    },
  },
} satisfies CardScript;
