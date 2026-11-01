// Investigating the Trail (Devourer Below, act 1) — back: Ritual Site enters play; cultists who got away spawn at the Main Path
import {
  campaignLogOf,
  type CardScript,
  createCard,
  findByCode,
  type G,
  locationByName,
  moveCard,
  push,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "back" }],
  fns: {
    back(g: G) {
      const aside = findByCode(g, "01156", ["setAside"]);
      if (aside) moveCard(g, aside.id, "location");
      const main = locationByName(g, "Main Path");
      const escaped = (campaignLogOf(g).cultistsGotAway as string[] | undefined) ?? [];
      for (const code of escaped) {
        const id = createCard(g, code, "limbo");
        push(g, { t: "Spawn", enemy: id, inv: null, at: main?.id ?? null });
      }
    },
  },
} satisfies CardScript;
