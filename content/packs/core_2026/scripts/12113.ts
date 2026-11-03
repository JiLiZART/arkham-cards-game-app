// Your Friend's Room — an enemy at a connecting location moves here and engages you
import {
  card,
  type CardScript,
  connections,
  def,
  type EffCtx,
  emit,
  enemiesAt,
  type GameContext,
  invName,
  setCardLocation,
  setEngaged,
  EVENT,
  type ScriptRun,
  queue,
  openWindow,
} from "../../../../src/engine/api";

export default {
  conditions: {
    enemyNextDoor: (game: GameContext, ctx: EffCtx) =>
      connections(game, ctx.source!).some((l) => enemiesAt(game, l).length > 0),
  },
  fns: {
    lure(game: GameContext, run: ScriptRun) {
      const here = run.source;
      const near = connections(game, here).flatMap((l) => enemiesAt(game, l));
      if (!near.length) return;
      const pick = run.chooseCard(
        near.map((e) => e.id),
        { text: "Choose an enemy at a connecting location", key: "chooseEnemy" },
      );
      const e = card(game, pick);
      setCardLocation(game, e.id, here);
      setEngaged(game, e.id, run.you);
      emit(
        game,
        EVENT.Engage,
        `${def(game, pick).name} moves here and engages ${invName(game, run.you)}`,
        {
          inv: run.you,
          card: pick,
        },
      );
      queue(
        game,
        openWindow("enemyEntersLocation", { enemy: pick, location: here }),
        openWindow("enemyEngages", { inv: run.you, enemy: pick }),
      );
    },
  },
} satisfies CardScript;
