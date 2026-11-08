// Recesses of Your Own Mind (Return to Dim Carcosa): the base value of the [willpower] of each investigator there is 0;
// each is as if at a copy of their own: no one commits to another's skill test there (`separateCopies`). Its story is
// The Writer (52061b).
import {
  baseSkill,
  type CardScript,
  type GameContext,
  type InstId,
  invsAt,
} from "../../../../src/engine/api";

export default {
  modifiers: (game: GameContext, self: InstId) => [
    { target: self, mod: { flag: "separateCopies" as const } },
    ...invsAt(game, self).map((i) => ({
      target: i,
      mod: { stat: "willpower" as const, value: -baseSkill(game, i, "willpower") },
    })),
  ],
} satisfies CardScript;
