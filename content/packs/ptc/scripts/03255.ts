// Shivering Pools (The Pallid Mask) — Forced: after you end your turn there, take 1 direct damage or lose 5 resources.
// Forced: when it is revealed, the topmost Catacombs goes into play below or to the right of it.
import { type CardScript, type GameContext, type ScriptRun } from "../../../../src/engine/api";
import { catacombsOneOf } from "../../../campaigns/the-path-to-carcosa/scripts/the-pallid-mask";

export default {
  abilities: [
    {
      kind: "forced",
      trigger: "turnEnds",
      condition: { eventAtThisLocation: true },
      effects: [
        {
          op: "chooseOne",
          options: [
            {
              label: "Take 1 direct damage",
              effects: [{ op: "takeDamage", amount: 1, direct: true }],
            },
            { label: "Lose 5 resources", effects: [{ op: "loseResources", amount: 5 }] },
          ],
        },
      ],
    },
    { kind: "forced", trigger: "revealed", run: "reveal" },
  ],
  fns: {
    reveal(game: GameContext, run: ScriptRun) {
      catacombsOneOf(game, run, run.source, ["below", "right"]);
    },
  },
} satisfies CardScript;
