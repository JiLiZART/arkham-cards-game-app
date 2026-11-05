// Finding A Way Inside (The Miskatonic Museum, act 1) — back: spending the clues brings Adam Lynch to an investigator
// and leads to "Night at the Museum"; breaking down the door (the Museum Halls' locked side, 02127) leads to "Breaking
// and Entering". Either way the Museum Halls are revealed
import {
  type CardScript,
  createCard,
  deckCards,
  findByCode,
  flags,
  type GameContext,
  moveCard,
  setController,
  turnOrder,
  def,
  emit,
  EVENT,
  ZONE,
  type ScriptRun,
  queue,
  revealLocation,
} from "../../../../src/engine/api";

/** the door was broken down: the act advanced through the Museum Halls' test, not the clues */
export const BROKE_IN = "museumBrokeIn";

/** an investigator the players choose takes control of a set-aside story ally */
export function takeAlly(game: GameContext, run: ScriptRun, code: string) {
  const ally = findByCode(game, code, [ZONE.SetAside]);
  if (!ally) return;
  const who = run.chooseInvestigator([...turnOrder(game)], {
    text: `Choose an investigator to take control of ${def(game, ally.id).name}`,
    key: "takeAlly",
    vars: { code },
  });
  moveCard(game, ally.id, ZONE.Play);
  setController(game, ally.id, who);
  emit(game, EVENT.Control, `${def(game, ally.id).name} joins the investigators`, {
    inv: who,
    card: ally.id,
  });
}

export default {
  abilities: [{ kind: "revelation", run: "back" }],
  fns: {
    back(game: GameContext, run: ScriptRun) {
      const brokeIn = !!flags.named(game, BROKE_IN);
      // one choice a step: Adam Lynch's controller before anything changes
      if (!brokeIn) takeAlly(game, run, "02139");
      else {
        // act 2 is "Breaking and Entering" instead of "Night at the Museum"
        const night = deckCards(game, "act").find((id) => def(game, id).code === "02123");
        if (night) {
          moveCard(game, night, ZONE.Removed);
          moveCard(game, createCard(game, "02124", ZONE.Limbo), ZONE.ActDeck, { top: true });
        }
      }
      const halls = findByCode(game, "02127", [ZONE.Location]);
      if (halls) queue(game, revealLocation(halls.id));
    },
  },
} satisfies CardScript;
