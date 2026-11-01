// They're Getting Out! (The Gathering, agenda 3)
import {
  canEnemyEnter,
  type CardScript,
  currentAct,
  currentAgenda,
  def,
  emit,
  enemies,
  findByCode,
  type G,
  inv,
  push,
  stepsToward,
  turnOrder,
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
        const next = stepsToward(g, e.location, [parlor.id]).find((l) => canEnemyEnter(g, e.id, l));
        if (next) {
          const from = e.location;
          e.location = next;
          emit(g, "enemyMove", `${def(g, e.id).name} moves toward the Parlor`, {
            card: e.id,
            data: { from, to: next },
          });
        }
      }
    },
    ghoulDoom(g: G) {
      const rooms = ["01112", "01115"]
        .map((c) => findByCode(g, c, ["location"])?.id)
        .filter(Boolean);
      const n = ghouls(g).filter((e) => rooms.includes(e.location!)).length;
      if (n && currentAgenda(g)) push(g, { t: "PlaceDoom", card: currentAgenda(g)!, n });
    },
    back(g: G) {
      const act = currentAct(g) ? (def(g, currentAct(g)!).stage ?? 1) : 3;
      if (act < 3) {
        push(g, { t: "Resolution", id: "R3" });
        return;
      }
      // each investigator that has not resigned is defeated and suffers 1 physical trauma
      for (const i of turnOrder(g))
        if (inv(g, i).status === "playing") push(g, { t: "Defeated", inv: i, by: "damage" });
    },
  },
} satisfies CardScript;
