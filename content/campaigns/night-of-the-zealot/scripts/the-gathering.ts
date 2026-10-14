// The Gathering: act 3 advances when the Ghoul Priest is defeated
import { push, type CardScript, type G } from "../../../../src/engine/api";

export default {
  hooks: {
    checkObjectives(g: G) {
      if (g.s.act && g.s.cards[g.s.act].code === "01110" && g.s.flags["defeated:01116"]) push(g, { t: "AdvanceAct" });
    },
  },
} satisfies CardScript;
