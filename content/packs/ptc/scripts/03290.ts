// Broken Steps (Black Stars Rise, version II) — Forced: after you enter, discard an asset you control, or draw the
// topmost [[Cultist]] enemy in the encounter discard pile.
import { type CardScript, type GameContext, type ScriptRun } from "../../../../src/engine/api";
import { brokenSteps } from "../../../campaigns/the-path-to-carcosa/scripts/black-stars-rise";

export default {
  abilities: [{ kind: "forced", trigger: "enterLocation", run: "steps" }],
  fns: {
    steps: (game: GameContext, run: ScriptRun) => brokenSteps(game, run, "cultist"),
  },
} satisfies CardScript;
