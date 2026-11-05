// Towering Beasts — peril; attaches to a Brood of Yog-Sothoth in play (1 damage if it is at your location); the Brood
// gets +1 fight and +1 health
import {
  attachTo,
  card,
  type CardScript,
  def,
  emit,
  EVENT,
  type GameContext,
  type InstId,
  inv,
  moveCard,
  queue,
  dealDamage,
  type ScriptRun,
  ZONE,
} from "../../../../src/engine/api";
import { broods } from "../../../campaigns/the-dunwich-legacy/scripts/undimensioned-and-unseen";

export default {
  abilities: [{ kind: "revelation", run: "tower" }],
  fns: {
    tower(game: GameContext, run: ScriptRun) {
      const pool = broods(game);
      if (!pool.length) return;
      const brood = run.chooseCard(pool, {
        text: "Choose a Brood of Yog-Sothoth for Towering Beasts",
        key: "toweringBeasts",
      });
      moveCard(game, run.source, ZONE.Attached);
      attachTo(game, run.source, brood);
      emit(game, EVENT.Attach, `Towering Beasts is attached to ${def(game, brood).name}`, {
        card: run.source,
      });
      if (card(game, brood).location === inv(game, run.you).location)
        queue(
          game,
          dealDamage({
            inv: run.you,
            damage: 1,
            horror: 0,
            direct: false,
            source: run.source,
          }),
        );
    },
  },
  modifiers: (game: GameContext, id: InstId) => {
    const host = card(game, id).attachedTo;
    if (card(game, id).zone !== ZONE.Attached || !host) return [];
    return [
      { target: host, mod: { stat: "fight" as const, value: 1 } },
      { target: host, mod: { stat: "enemyHealth" as const, value: 1 } },
    ];
  },
} satisfies CardScript;
