// The Devourer Below: act objectives and the final confrontation with Umôrdhoth
import {
  cardIf,
  type CardScript,
  currentAct,
  findByCode,
  flags,
  type GameContext,
  invsAt,
  push,
  turnOrder,
  ZONE,
  STEP,
} from "../../../../src/engine/api";

export default {
  hooks: {
    checkObjectives(game: GameContext) {
      if (flags.devourer.get(game) && flags.defeated.get(game, "01157")) {
        push(game, { t: STEP.Resolution, id: "R2" });
        return;
      }
      const act = cardIf(game, currentAct(game)) ?? null;
      if (!act) return;
      if (act.code === "01147") {
        const site = findByCode(game, "01156", [ZONE.Location]);
        if (site && invsAt(game, site.id).length) push(game, { t: STEP.AdvanceAct });
      }
      if (act.code === "01148" && act.clues >= 2 * turnOrder(game).length)
        push(game, { t: STEP.AdvanceAct });
    },
  },
} satisfies CardScript;
