// The Third Night (A Phantom of Truth, agenda 3): agenda 1's rule. Back (Dawn At Last): with as much Doubt as Conviction,
// Resolution 3; with more Conviction, act 2b (Shepherd's Crook): Resolution 2 if you intruded on a secret meeting, else 1.
import { type CardScript, type GameContext, queue, endScenario } from "../../../../src/engine/api";
import {
  convictionLeads,
  lostLamb,
} from "../../../campaigns/the-path-to-carcosa/scripts/a-phantom-of-truth";
import { nightThreshold } from "./03201";

export default {
  abilities: [{ kind: "revelation", run: "dawn" }],
  fns: {
    dawn(game: GameContext) {
      if (convictionLeads(game)) lostLamb(game);
      else queue(game, endScenario({ id: "R3" }));
    },
  },
  hooks: { doomThreshold: nightThreshold },
} satisfies CardScript;
