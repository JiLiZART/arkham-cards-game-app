// Return to Black Stars Rise (setup card 52054): the base scenario's script, with the box's rules over it — one pile of
// Cloister and Knight's Hall at random, the original (03294, 03295) or the box's (52055, 52056), is set aside for the
// Abbey Church; the other leaves the game. The box's Cloister finds the tower key, its Knight's Hall a guide.
import {
  allCards,
  type CardScript,
  composeScript,
  type GameContext,
  moveCard,
  randomInt,
  ZONE,
} from "../../../../src/engine/api";
import base, {
  CLOISTER,
  KNIGHTS_HALL,
  NEW_CLOISTER_PAIR,
} from "../../the-path-to-carcosa/scripts/black-stars-rise";

/** what the box adds to the base scenario */
const returnTo: CardScript = {
  fns: {
    cloisterPile(game: GameContext) {
      const removed = randomInt(game, 2) === 1 ? [CLOISTER, KNIGHTS_HALL] : NEW_CLOISTER_PAIR;
      for (const c of allCards(game).filter(
        (x) => x.zone === ZONE.SetAside && removed.includes(x.code),
      ))
        moveCard(game, c.id, ZONE.Removed);
    },
  },
};

export default composeScript(base, returnTo);
