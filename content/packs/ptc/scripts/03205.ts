// The Parisian Conspiracy, v. II (A Phantom of Truth, act 1): v. I's objectives. Back (True Evil): spent clues spawn The
// Organist (Hopeless, I Defied Him) at the location farthest from all investigators; otherwise each investigator takes
// 2 horror and he spawns at the lead's location.
import { type CardScript, type GameContext, type ScriptRun } from "../../../../src/engine/api";
import { ORGANIST } from "../../../campaigns/the-path-to-carcosa/scripts/a-phantom-of-truth";
import { organistArrives, parisianObjective } from "./03204";

export default {
  abilities: [...parisianObjective.abilities!, { kind: "revelation", run: "trueEvil" }],
  conditions: parisianObjective.conditions,
  fns: {
    ...parisianObjective.fns,
    trueEvil(game: GameContext, run: ScriptRun) {
      organistArrives(game, run.ctx, ORGANIST, run.ctx.actAdvancedBy === "doom");
    },
  },
} satisfies CardScript;
