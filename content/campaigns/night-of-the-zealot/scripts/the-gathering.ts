// The Gathering: act 3 advances when the Ghoul Priest is defeated
import {
  cardIf,
  type CardScript,
  currentAct,
  flags,
  type G,
  push,
} from "../../../../src/engine/api";

export default {
  hooks: {
    checkObjectives(g: G) {
      if (cardIf(g, currentAct(g))?.code === "01110" && flags.defeated.get(g, "01116"))
        push(g, { t: "AdvanceAct" });
    },
  },
} satisfies CardScript;
