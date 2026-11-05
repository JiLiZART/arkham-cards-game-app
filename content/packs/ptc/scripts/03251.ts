// Well of Souls (The Pallid Mask) — Forced: after you end your turn there, take 1 direct horror or discard 2 random cards
// from your hand. Forced: when it is revealed, the topmost Catacombs goes into play above, below or to the right of it.
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
              label: "Take 1 direct horror",
              effects: [{ op: "takeHorror", amount: 1, direct: true }],
            },
            {
              label: "Discard 2 random cards from your hand",
              effects: [{ op: "discardFromHand", amount: 2, random: true }],
            },
          ],
        },
      ],
    },
    { kind: "forced", trigger: "revealed", run: "reveal" },
  ],
  fns: {
    reveal(game: GameContext, run: ScriptRun) {
      catacombsOneOf(game, run, run.source, ["above", "below", "right"]);
    },
  },
} satisfies CardScript;
