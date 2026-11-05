// Labyrinth of Bones (The Pallid Mask) — Forced: when it is revealed, the top 3 Catacombs go into play above, below and to the
// right of it.
import { type CardScript, type GameContext, type ScriptRun } from "../../../../src/engine/api";
import { catacombsEach } from "../../../campaigns/the-path-to-carcosa/scripts/the-pallid-mask";

export default {
  abilities: [{ kind: "forced", trigger: "revealed", run: "reveal" }],
  fns: {
    reveal(game: GameContext, run: ScriptRun) {
      catacombsEach(game, run.source, ["above", "below", "right"]);
    },
  },
} satisfies CardScript;
