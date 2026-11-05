// Saracenic Script (Undimensioned and Unseen, act 1) — only investigators at Whateley Ruins spend its clues (`actSpendAt`
// in cards.json); back: each investigator puts a set-aside Esoteric Formula into play, and if Dr. Armitage was
// sacrificed to Yog-Sothoth the transcription costs 1 doom on the current agenda
import {
  asStrings,
  campaignLogOf,
  cardsIn,
  type CardScript,
  currentAgenda,
  def,
  emit,
  EVENT,
  type GameContext,
  moveCard,
  placeDoom,
  queue,
  setController,
  turnOrder,
  ZONE,
} from "../../../../src/engine/api";

const FORMULA = "02254";
const ARMITAGE = "02040";

export default {
  abilities: [{ kind: "revelation", run: "back" }],
  fns: {
    back(game: GameContext) {
      const formulas = cardsIn(game, ZONE.SetAside).filter((c) => c.code === FORMULA);
      turnOrder(game).forEach((i, k) => {
        const f = formulas[k];
        if (!f) return;
        moveCard(game, f.id, ZONE.Play);
        setController(game, f.id, i);
        emit(game, EVENT.Control, `${def(game, f.id).name} is put into play`, {
          inv: i,
          card: f.id,
        });
      });
      const agenda = currentAgenda(game);
      if (agenda && asStrings(campaignLogOf(game).sacrificed).includes(ARMITAGE))
        queue(game, placeDoom({ card: agenda, n: 1 }));
    },
  },
} satisfies CardScript;
