// Extracurricular Activity: Jazz's control advances act 2, The Experiment's defeat leads to act 3b (→R3), its arrival in
// the Dormitories advances agenda 3 (→R4); the group clue spends of the Faculty Offices (→R1) and the Dormitories (→R2)
// are those locations' own
import {
  cardIf,
  type CardScript,
  currentAct,
  currentAgenda,
  findByCode,
  flags,
  type GameContext,
  ZONE,
  queue,
  advanceAct,
  advanceAgenda,
  endScenario,
} from "../../../../src/engine/api";

export default {
  hooks: {
    checkObjectives(game: GameContext) {
      // The Experiment: "if defeated, advance to act 3b"
      if (flags.defeated.get(game, "02058")) {
        queue(game, endScenario({ id: "R3" }));
        return;
      }
      const act = cardIf(game, currentAct(game))?.code;
      if (act === "02046" && findByCode(game, "02060", [ZONE.Play])?.controller)
        queue(game, advanceAct());
      const agenda = cardIf(game, currentAgenda(game))?.code;
      const experiment = findByCode(game, "02058", [ZONE.Enemy]);
      const dorms = findByCode(game, "02052", [ZONE.Location]);
      if (agenda === "02044" && experiment && dorms && experiment.location === dorms.id)
        queue(game, advanceAgenda());
    },
  },
} satisfies CardScript;
