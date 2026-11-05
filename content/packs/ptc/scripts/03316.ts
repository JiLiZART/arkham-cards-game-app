// Dim Carcosa (scenario reference card): the token table is the scenario's; its elder thing's "during an attack or
// evasion attempt against a [[Monster]] or [[Ancient One]] enemy" is this condition, kept here so Return to Dim
// Carcosa's copied table finds it.
import {
  cardIf,
  type CardScript,
  currentTest,
  def,
  type GameContext,
} from "../../../../src/engine/api";

export default {
  conditions: {
    againstMonsterOrAncientOne(game: GameContext) {
      const t = currentTest(game);
      if (!t || (t.kind !== "fight" && t.kind !== "evade") || !t.target) return false;
      const e = cardIf(game, t.target);
      return !!e && def(game, e.id).traits.some((x) => x === "Monster" || x === "Ancient One");
    },
  },
} satisfies CardScript;
