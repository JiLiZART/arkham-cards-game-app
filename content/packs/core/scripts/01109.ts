// The Barrier (The Gathering, act 2): at round end, investigators in the Hallway may spend 3 clues/investigator
import {
  ask,
  def,
  emit,
  findByCode,
  inv,
  moveCard,
  push,
  type CardScript,
  type EffCtx,
  type G,
  type Step,
} from "../../../../src/engine/api";

export default {
  abilities: [
    { kind: "forced", trigger: "roundEnds", run: "objective" },
    { kind: "revelation", run: "back" },
  ],
  fns: {
    objective(g: G, _ctx: EffCtx, _args: unknown, step?: Step) {
      const hallway = findByCode(g, "01112", ["location"]);
      if (!hallway) return;
      const there = g.s.order.filter(
        (i) => inv(g, i).status === "playing" && inv(g, i).location === hallway.id,
      );
      const need = 3 * g.s.order.length;
      const have = there.reduce((n, i) => n + inv(g, i).clues, 0);
      if (have < need) return;
      const yes = ask<boolean>(
        g,
        step!,
        g.s.lead,
        "generic",
        `The Barrier: spend ${need} clues (investigators in the Hallway) to advance?`,
        [
          { id: "yes", label: `Spend ${need} clues and advance`, value: true },
          { id: "no", label: "Not now", value: false },
        ],
        { key: "barrier", vars: { n: need } },
      );
      if (!yes) return;
      let n = need;
      for (const i of there) {
        const take = Math.min(n, inv(g, i).clues);
        inv(g, i).clues -= take;
        n -= take;
      }
      push(g, { t: "AdvanceAct" });
    },
    back(g: G) {
      const parlor = findByCode(g, "01115", ["location"])!;
      const hallway = findByCode(g, "01112", ["location"])!;
      push(g, {
        t: "Script",
        code: "__engine",
        fn: "revealLocation",
        ctx: { location: parlor.id },
      });
      const lita = findByCode(g, "01117", ["setAside"]);
      if (lita) {
        moveCard(g, lita.id, "attached", { location: parlor.id });
        lita.controller = null;
        emit(g, "lita", `Lita Chantler is in the ${def(g, parlor.id).name}`, { card: lita.id });
      }
      const priest = findByCode(g, "01116", ["setAside"]);
      if (priest) push(g, { t: "Spawn", enemy: priest.id, inv: null, at: hallway.id });
    },
  },
} satisfies CardScript;
