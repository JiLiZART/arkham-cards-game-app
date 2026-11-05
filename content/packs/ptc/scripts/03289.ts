// Broken Steps (Black Stars Rise, version I) — Forced: after you enter, lose 1 action, or draw the topmost [[Omen]]
// treachery in the encounter discard pile.
import { type CardScript, type GameContext, type ScriptRun } from "../../../../src/engine/api";
import { brokenSteps } from "../../../campaigns/the-path-to-carcosa/scripts/black-stars-rise";

export default {
  abilities: [{ kind: "forced", trigger: "enterLocation", run: "steps" }],
  fns: {
    steps: (game: GameContext, run: ScriptRun) => brokenSteps(game, run, "omen"),
  },
} satisfies CardScript;
