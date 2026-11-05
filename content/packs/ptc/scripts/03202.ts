// The Second Night (A Phantom of Truth, agenda 2): agenda 1's rule. Back (A Red Sun Rises): agenda 1's back, then Jordan
// Perry spawns in Montparnasse unless he is listed under VIPs Slain (set aside by the setup only then).
import {
  type CardScript,
  findByCode,
  type GameContext,
  ZONE,
  queue,
  spawn,
} from "../../../../src/engine/api";
import {
  JORDAN,
  MONTPARNASSE,
} from "../../../campaigns/the-path-to-carcosa/scripts/a-phantom-of-truth";
import { daybreak, nightThreshold } from "./03201";

export default {
  abilities: [{ kind: "revelation", run: "redSun" }],
  fns: {
    redSun(game: GameContext) {
      daybreak(game);
      const jordan = findByCode(game, JORDAN, [ZONE.SetAside]);
      const at = findByCode(game, MONTPARNASSE, [ZONE.Location]);
      if (jordan && at) queue(game, spawn({ enemy: jordan.id, inv: null, at: at.id }));
    },
  },
  hooks: { doomThreshold: nightThreshold },
} satisfies CardScript;
