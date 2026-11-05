// Blocked Passage (The Pallid Mask) — Forced: when you reveal it, take 2 damage; you cannot leave it this round (ignored
// while the act is Leading the Way).
import { type CardScript, type GameContext } from "../../../../src/engine/api";
import {
  actIs,
  LEADING_THE_WAY,
} from "../../../campaigns/the-path-to-carcosa/scripts/the-pallid-mask";

export default {
  abilities: [
    {
      kind: "forced",
      trigger: "revealed",
      condition: { script: "notLed" },
      effects: [
        { op: "takeDamage", amount: 2 },
        { op: "modify", mod: { flag: "cannotMove" }, until: "round" },
      ],
    },
  ],
  conditions: { notLed: (game: GameContext) => !actIs(game, LEADING_THE_WAY) },
} satisfies CardScript;
