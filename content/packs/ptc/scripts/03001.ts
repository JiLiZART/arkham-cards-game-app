// Mark Harrigan — he begins the game with Sophie in play; his reaction and elder sign are in cards.json
import {
  card,
  type CardScript,
  createCard,
  emit,
  EVENT,
  type GameContext,
  type HookRun,
  inv,
  moveCard,
  setController,
  ZONE,
} from "../../../../src/engine/api";

const SOPHIE = "03009";

export default {
  hooks: {
    setup(game: GameContext, run: HookRun) {
      // the copy in his deck (a deck without one still begins with Sophie)
      const sophie =
        inv(game, run.you).deck.find((id) => card(game, id).code === SOPHIE) ??
        createCard(game, SOPHIE, ZONE.Limbo, run.you);
      moveCard(game, sophie, ZONE.Play);
      setController(game, sophie, run.you);
      emit(game, EVENT.Play, `${inv(game, run.you).name} begins with Sophie in play`, {
        inv: run.you,
        card: sophie,
      });
    },
  },
} satisfies CardScript;
