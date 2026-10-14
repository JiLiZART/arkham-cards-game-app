// What Have You Done? (The Gathering, act 3) — back: burn it down (R1) or not (R2)
import { ask, push, type CardScript, type EffCtx, type G, type Step } from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "back" }],
  fns: {
    back(g: G, _ctx: EffCtx, _args: unknown, step?: Step) {
      const r = ask<string>(g, step!, g.s.lead, "generic", "Defending the Home — the lead investigator must decide:", [
        { id: "R1", label: "It was never much of a home. Burn it down! (→R1)", value: "R1" },
        { id: "R2", label: "This hell-pit is my home! No way are we burning it! (→R2)", value: "R2" },
      ]);
      if (r) push(g, { t: "Resolution", id: r });
    },
  },
} satisfies CardScript;
