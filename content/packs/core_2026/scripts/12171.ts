// Brethren of Ash — doom that would be placed deals each investigator 1 direct damage instead
import { activeInvs, emit, push, type CardScript, type G } from "../../../../src/engine/api";

export default {
  wouldPlaceDoom(g: G) {
    emit(g, "noDoom", "Instead of doom, each investigator takes 1 direct damage");
    for (const i of activeInvs(g))
      push(g, {
        t: "AssignDamage",
        inv: i,
        damage: 1,
        horror: 0,
        direct: true,
        source: g.s.agenda,
      });
    return true;
  },
} satisfies CardScript;
