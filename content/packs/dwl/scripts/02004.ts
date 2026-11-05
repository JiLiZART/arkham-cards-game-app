// Jim Culver — skulls he reveals are 0 (a constant flag in cards.json); he may treat an elder sign he reveals as a skull
import { type CardScript, type GameContext, treatTokenAs } from "../../../../src/engine/api";

export default {
  abilities: [
    {
      kind: "reaction",
      trigger: "tokenRevealed",
      label: "Jim Culver: treat the elder sign as a skull",
      condition: { all: [{ yourSkillTest: true }, { tokenIs: ["elderSign"] }] },
      run: "asSkull",
    },
  ],
  fns: {
    asSkull(game: GameContext) {
      treatTokenAs(game, "skull");
    },
  },
} satisfies CardScript;
