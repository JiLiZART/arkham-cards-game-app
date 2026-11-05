// Bone-Filled Cavern (The Pallid Mask) — while you investigate it you have 1 fewer hand slot. Forced: when it is revealed, the top
// 2 Catacombs go into play below and to the right of it.
import { type CardScript, type GameContext, type ScriptRun } from "../../../../src/engine/api";
import { catacombsEach } from "../../../campaigns/the-path-to-carcosa/scripts/the-pallid-mask";

export default {
  abilities: [
    {
      kind: "constant",
      modifiers: [
        { stat: "handSlots", value: -1, scope: "investigatorsAtLocation", when: "investigating" },
      ],
    },
    { kind: "forced", trigger: "revealed", run: "reveal" },
  ],
  fns: {
    reveal(game: GameContext, run: ScriptRun) {
      catacombsEach(game, run.source, ["below", "right"]);
    },
  },
} satisfies CardScript;
