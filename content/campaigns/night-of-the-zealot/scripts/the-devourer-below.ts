// The Devourer Below: act objectives and the final confrontation with Umôrdhoth
import {
  cardIf,
  type CardScript,
  currentAct,
  findByCode,
  flags,
  type GameContext,
  invsAt,
  turnOrder,
  ZONE,
  queue,
  endScenario,
  advanceAct,
} from "../../../../src/engine/api";

export default {
  hooks: {
    checkObjectives(game: GameContext) {
      if (flags.devourer.get(game) && flags.defeated.get(game, "01157")) {
        queue(game, endScenario({ id: "R2" }));
        return;
      }
      const act = cardIf(game, currentAct(game)) ?? null;
      if (!act) return;
      if (act.code === "01147") {
        const site = findByCode(game, "01156", [ZONE.Location]);
        if (site && invsAt(game, site.id).length) queue(game, advanceAct());
      }
      if (act.code === "01148" && act.clues >= 2 * turnOrder(game).length)
        queue(game, advanceAct());
    },
  },
} satisfies CardScript;
