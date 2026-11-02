// Brethren of Ash — doom that would be placed deals each investigator 1 direct damage instead
import {
  activeInvs,
  type CardScript,
  currentAgenda,
  emit,
  type GameContext,
  push,
  EVENT,
  STEP,
} from "../../../../src/engine/api";

export default {
  wouldPlaceDoom(game: GameContext) {
    emit(game, EVENT.NoDoom, "Instead of doom, each investigator takes 1 direct damage");
    for (const i of activeInvs(game))
      push(game, {
        t: STEP.AssignDamage,
        inv: i,
        damage: 1,
        horror: 0,
        direct: true,
        source: currentAgenda(game),
      });
    return true;
  },
} satisfies CardScript;
