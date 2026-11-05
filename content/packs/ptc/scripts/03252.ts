// Candlelit Tunnels (The Pallid Mask) — [action]: test [intellect] (3) to read an ancient sign; a success looks at the
// revealed side of a Catacombs in play (group limit once per game). Forced: when it is revealed, the top 2 Catacombs
// go into play to its left and right.
import { type CardScript, type GameContext, type ScriptRun } from "../../../../src/engine/api";
import {
  catacombsEach,
  peek,
} from "../../../campaigns/the-path-to-carcosa/scripts/the-pallid-mask";

export default {
  abilities: [
    {
      kind: "action",
      usableBy: "atLocation",
      label: "Candlelit Tunnels: test intellect (3) to look at a Catacombs' revealed side",
      limit: { per: "game", count: 1, group: true },
      effects: [
        {
          op: "skillTest",
          skill: "intellect",
          difficulty: 3,
          onSuccess: [{ op: "script", fn: "peek" }],
        },
      ],
    },
    { kind: "forced", trigger: "revealed", run: "reveal" },
  ],
  fns: {
    peek,
    reveal(game: GameContext, run: ScriptRun) {
      catacombsEach(game, run.source, ["left", "right"]);
    },
  },
} satisfies CardScript;
