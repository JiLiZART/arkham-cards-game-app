// The Midnight Masks: Your House redirects the Ghoul Priest; 6 unique Cultists in the victory display advance the act
import {
  cardsIn,
  def,
  findByCode,
  push,
  type CardScript,
  type EffCtx,
  type G,
} from "../../../../src/engine/api";

export default {
  hooks: {
    spawnRedirect(g: G, ctx: EffCtx) {
      if (g.s.cards[ctx.enemy!].code !== "01116") return;
      const house = findByCode(g, "01124", ["location"]);
      if (house) ctx.location = house.id;
    },
    checkObjectives(g: G) {
      if (!g.s.act || g.s.cards[g.s.act].code !== "01123") return;
      const cultists = new Set(
        cardsIn(g, "victory")
          .filter((c) => def(g, c.id).unique && def(g, c.id).traits.includes("Cultist"))
          .map((c) => c.code),
      );
      if (cultists.size >= 6) push(g, { t: "AdvanceAct" });
    },
  },
} satisfies CardScript;
