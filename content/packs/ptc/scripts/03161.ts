// Torturous Descent (The Unspeakable Oath, agenda 2) — back: the lead shuffles a random set-aside Monster into the
// encounter deck; Constance Dumaine spawns in the Garden unless she was slain (then she was never set aside).
import {
  allCards,
  type CardScript,
  emit,
  type GameContext,
  moveCard,
  randomInt,
  shuffleDeck,
  EVENT,
  ZONE,
} from "../../../../src/engine/api";
import { MONSTERS } from "../../../campaigns/the-path-to-carcosa/scripts/the-unspeakable-oath";
import { oathAgenda } from "./03160";

export default oathAgenda({
  abilities: [
    {
      kind: "revelation",
      effects: [
        { op: "script", fn: "yellowSign" },
        { op: "spawnSetAside", code: "03065b", at: "Garden" },
      ],
    },
  ],
  fns: {
    yellowSign(game: GameContext) {
      const pile = allCards(game).filter(
        (c) => c.zone === ZONE.SetAside && MONSTERS.includes(c.code),
      );
      if (!pile.length) return;
      moveCard(game, pile[randomInt(game, pile.length)].id, ZONE.EncounterDeck);
      shuffleDeck(game, "encounter");
      emit(game, EVENT.Shuffle, "A set-aside Monster is shuffled into the encounter deck");
    },
  },
}) satisfies CardScript;
