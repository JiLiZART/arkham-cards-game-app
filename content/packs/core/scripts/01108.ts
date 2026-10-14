// Trapped (The Gathering, act 1) — back: The Door on the Floor
import { def, discard, emit, enemiesAt, findByCode, moveCard, push, type CardScript, type G } from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "back" }],
  fns: {
    back(g: G) {
      for (const code of ["01112", "01114", "01113", "01115"]) {
        const c = findByCode(g, code, ["setAside"]);
        if (c) moveCard(g, c.id, "location");
      }
      const study = findByCode(g, "01111", ["location"]);
      const hallway = findByCode(g, "01112", ["location"])!;
      if (study) for (const e of enemiesAt(g, study.id)) discard(g, e.id);
      for (const i of g.s.order) if (g.s.invs[i].status === "playing") g.s.invs[i].location = hallway.id;
      if (study) moveCard(g, study.id, "removed");
      emit(g, "place", `Each investigator is placed in the ${def(g, hallway.id).name}`);
      push(g, { t: "Script", code: "__engine", fn: "revealLocation", ctx: { location: hallway.id } });
    },
  },
} satisfies CardScript;
