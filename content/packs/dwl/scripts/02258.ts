// Attracting Attention — surge (a keyword); each Brood of Yog-Sothoth in play moves once toward you
import {
  canEnemyEnter,
  card,
  type CardScript,
  def,
  emit,
  EVENT,
  type GameContext,
  inv,
  openWindow,
  queue,
  setCardLocation,
  stepsToward,
  type ScriptRun,
} from "../../../../src/engine/api";
import { broods } from "../../../campaigns/the-dunwich-legacy/scripts/undimensioned-and-unseen";

export default {
  abilities: [{ kind: "revelation", run: "attract" }],
  fns: {
    attract(game: GameContext, run: ScriptRun) {
      const you = inv(game, run.you).location;
      if (!you) return;
      for (const id of broods(game)) {
        const from = card(game, id).location;
        if (!from || from === you) continue;
        const to = stepsToward(game, from, [you]).find((l) => canEnemyEnter(game, id, l));
        if (!to) continue;
        setCardLocation(game, id, to);
        emit(
          game,
          EVENT.EnemyMove,
          `${def(game, id).name} moves toward ${inv(game, run.you).name}`,
          {
            card: id,
            data: { from, to },
          },
        );
        queue(game, openWindow("enemyEntersLocation", { enemy: id, location: to }));
      }
    },
  },
} satisfies CardScript;
