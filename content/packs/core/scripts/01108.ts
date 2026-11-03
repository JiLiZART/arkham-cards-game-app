// Trapped (The Gathering, act 1) — back: The Door on the Floor
import {
  activeInvs,
  type CardScript,
  def,
  discard,
  emit,
  enemiesAt,
  findByCode,
  type GameContext,
  moveCard,
  placeInvestigator,
  EVENT,
  ZONE,
  queue,
  revealLocation,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "back" }],
  fns: {
    back(game: GameContext) {
      for (const code of ["01112", "01114", "01113", "01115"]) {
        const c = findByCode(game, code, [ZONE.SetAside]);
        if (c) moveCard(game, c.id, ZONE.Location);
      }
      const study = findByCode(game, "01111", [ZONE.Location]);
      const hallway = findByCode(game, "01112", [ZONE.Location])!;
      if (study) for (const e of enemiesAt(game, study.id)) discard(game, e.id);
      for (const i of activeInvs(game)) placeInvestigator(game, i, hallway.id);
      if (study) moveCard(game, study.id, ZONE.Removed);
      emit(game, EVENT.Place, `Each investigator is placed in the ${def(game, hallway.id).name}`);
      queue(game, revealLocation(hallway.id));
    },
  },
} satisfies CardScript;
