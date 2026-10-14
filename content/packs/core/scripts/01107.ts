// They're Getting Out! (The Gathering, agenda 3)
import {
  def, emit, enemies, findByCode, push, stepsToward, type CardScript, type G,
} from "../../../../src/engine/api";

const ghouls = (g: G) => enemies(g).filter((e) => def(g, e.id).traits.includes("Ghoul"));

export default {
  abilities: [
    { kind: "forced", trigger: "enemyPhaseEnds", run: "ghoulsMove" },
    { kind: "forced", trigger: "roundEnds", run: "ghoulDoom" },
    { kind: "revelation", run: "back" },
  ],
  fns: {
    ghoulsMove(g: G) {
      const parlor = findByCode(g, "01115", ["location"]);
      if (!parlor) return;
      for (const e of ghouls(g)) {
        if (e.engagedWith || !e.location) continue;
        const next = stepsToward(g, e.location, [parlor.id])[0];
        if (next) {
          e.location = next;
          emit(g, "enemyMove", `${def(g, e.id).name} moves toward the Parlor`, { card: e.id });
        }
      }
    },
    ghoulDoom(g: G) {
      const rooms = ["01112", "01115"].map((c) => findByCode(g, c, ["location"])?.id).filter(Boolean);
      const n = ghouls(g).filter((e) => rooms.includes(e.location!)).length;
      if (n && g.s.agenda) push(g, { t: "PlaceDoom", card: g.s.agenda, n });
    },
    back(g: G) {
      const act = g.s.act ? def(g, g.s.act).stage ?? 1 : 3;
      if (act < 3) {
        push(g, { t: "Resolution", id: "R3" });
        return;
      }
      // each investigator that has not resigned is defeated and suffers 1 physical trauma
      for (const i of g.s.order) if (g.s.invs[i].status === "playing") push(g, { t: "Defeated", inv: i, by: "damage" });
    },
  },
} satisfies CardScript;
