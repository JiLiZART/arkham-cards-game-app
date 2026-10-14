// The Devourer Below: act objectives and the final confrontation with Umôrdhoth
import { card, findByCode, invsAt, push, type CardScript, type G } from "../../../../src/engine/api";

export default {
  hooks: {
    checkObjectives(g: G) {
      if (g.s.flags.devourer && g.s.flags["defeated:01157"]) {
        push(g, { t: "Resolution", id: "R2" });
        return;
      }
      const act = g.s.act ? card(g, g.s.act) : null;
      if (!act) return;
      if (act.code === "01147") {
        const site = findByCode(g, "01156", ["location"]);
        if (site && invsAt(g, site.id).length) push(g, { t: "AdvanceAct" });
      }
      if (act.code === "01148" && act.clues >= 2 * g.s.order.length) push(g, { t: "AdvanceAct" });
    },
  },
} satisfies CardScript;
