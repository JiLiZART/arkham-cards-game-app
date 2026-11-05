// Where There's Smoke (Return to The Essex County Express, agenda 0) — its other side is The Conductor (51026b): as the
// agenda advances, the set-aside Conductor spawns at the leftmost car (the scenario's spawnRedirect)
import {
  type CardScript,
  findByCode,
  type GameContext,
  type ScriptRun,
  queue,
  spawn,
  ZONE,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "back" }],
  fns: {
    back(game: GameContext, run: ScriptRun) {
      const conductor = findByCode(game, "51026b", [ZONE.SetAside]);
      if (conductor) queue(game, spawn({ enemy: conductor.id, inv: run.you }));
    },
  },
} satisfies CardScript;
