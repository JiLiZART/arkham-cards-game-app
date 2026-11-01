// The Devourer Below: act objectives and the final confrontation with Umôrdhoth
import {
  cardIf,
  type CardScript,
  currentAct,
  findByCode,
  flags,
  type G,
  invsAt,
  push,
  turnOrder,
} from "../../../../src/engine/api";

export default {
  hooks: {
    checkObjectives(g: G) {
      if (flags.devourer.get(g) && flags.defeated.get(g, "01157")) {
        push(g, { t: "Resolution", id: "R2" });
        return;
      }
      const act = cardIf(g, currentAct(g)) ?? null;
      if (!act) return;
      if (act.code === "01147") {
        const site = findByCode(g, "01156", ["location"]);
        if (site && invsAt(g, site.id).length) push(g, { t: "AdvanceAct" });
      }
      if (act.code === "01148" && act.clues >= 2 * turnOrder(g).length)
        push(g, { t: "AdvanceAct" });
    },
  },
} satisfies CardScript;
