// "Ashcan" Pete — he begins the game with Duke in play; his fast ability needs an exhausted asset that can ready
import {
  canReady,
  card,
  type CardScript,
  controlled,
  createCard,
  def,
  type EffCtx,
  emit,
  EVENT,
  type GameContext,
  type HookRun,
  inv,
  moveCard,
  setController,
  ZONE,
} from "../../../../src/engine/api";

const DUKE = "02014";

export default {
  conditions: {
    assetToReady: (game: GameContext, ctx: EffCtx) =>
      !!ctx.you &&
      controlled(game, ctx.you).some(
        (c) => def(game, c.id).type === "asset" && c.exhausted && canReady(game, c.id),
      ),
  },
  hooks: {
    setup(game: GameContext, run: HookRun) {
      // the copy in his deck (a deck without one still begins with Duke)
      const duke =
        inv(game, run.you).deck.find((id) => card(game, id).code === DUKE) ??
        createCard(game, DUKE, ZONE.Limbo, run.you);
      moveCard(game, duke, ZONE.Play);
      setController(game, duke, run.you);
      emit(game, EVENT.Play, `${inv(game, run.you).name} begins with Duke in play`, {
        inv: run.you,
        card: duke,
      });
    },
  },
} satisfies CardScript;
