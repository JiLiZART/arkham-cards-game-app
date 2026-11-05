// The Miskatonic Museum: the Exhibit deck (the Restricted Hall among the bottom three of the six halls, unrevealed side
// up, as a side deck the Museum Halls draw from), and the act objectives: entering the Restricted Hall (act 2), its clues
// gone (act 3). The Horror's placement, the R1/R2 choice and the final agenda's defeat are their cards' own
import {
  card,
  cardIf,
  type CardScript,
  currentAct,
  findByCode,
  type GameContext,
  inv,
  moveCard,
  shuffleList,
  turnOrder,
  ZONE,
  queue,
  advanceAct,
} from "../../../../src/engine/api";
import { EXHIBIT_DECK } from "../../../packs/dwl/scripts/02127";
import { RESTRICTED_HALL } from "../../../packs/dwl/scripts/02123";

const HALLS = ["02132", "02133", "02134", "02135", "02136"];

export default {
  fns: {
    /** the Restricted Hall shuffled with 2 random halls as the bottom 3, the other 3 on top in random order */
    exhibitDeck(game: GameContext) {
      const others = [...HALLS];
      shuffleList(game, others);
      const bottom = [RESTRICTED_HALL, ...others.slice(0, 2)];
      shuffleList(game, bottom);
      for (const code of [...others.slice(2), ...bottom]) {
        const hall = findByCode(game, code, [ZONE.SetAside]);
        if (hall) moveCard(game, hall.id, ZONE.SideDeck, { deck: EXHIBIT_DECK });
      }
    },
  },
  hooks: {
    checkObjectives(game: GameContext) {
      const act = cardIf(game, currentAct(game))?.code;
      const hall = findByCode(game, RESTRICTED_HALL, [ZONE.Location]);
      if (!hall) return;
      // acts 2: "if an investigator enters the Restricted Hall, advance"
      if (
        (act === "02123" || act === "02124") &&
        turnOrder(game).some((i) => inv(game, i).location === hall.id)
      )
        queue(game, advanceAct());
      // act 3: "if there are no clues remaining in the Restricted Hall, advance"
      if (act === "02125" && card(game, hall.id).revealed && card(game, hall.id).clues === 0)
        queue(game, advanceAct());
    },
  },
} satisfies CardScript;
