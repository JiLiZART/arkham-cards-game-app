// Helpless Passenger — revelation: into play at the location to your left (or yours if there is none), controlled by no
// one; parley: take control of it. Leaving play, each investigator takes 1 horror (data: leavesPlay)
import {
  type CardScript,
  def,
  emit,
  EVENT,
  type GameContext,
  inv,
  moveCard,
  type ScriptRun,
  setController,
  ZONE,
} from "../../../../src/engine/api";
import { besides } from "../../../campaigns/the-dunwich-legacy/scripts/essex-county-express";

export default {
  abilities: [
    { kind: "revelation", run: "arrive" },
    {
      kind: "action",
      designator: "parley",
      label: "Helpless Passenger: parley (take control)",
      usableBy: "atLocation",
      condition: { controlled: false },
      effects: [{ op: "takeControl" }],
    },
  ],
  fns: {
    arrive(game: GameContext, run: ScriptRun) {
      const here = inv(game, run.you).location;
      const at = besides(game, here, -1) ?? here;
      if (!at) return;
      moveCard(game, run.source, ZONE.Attached, { location: at });
      setController(game, run.source, null);
      emit(game, EVENT.Place, `Helpless Passenger is at ${def(game, at).name}`, {
        card: run.source,
      });
    },
  },
} satisfies CardScript;
