// The Pallid Mask's reference card — the cultist's "If this token is revealed during an attack, and this skill test is
// successful, this attack deals 1 less damage" (Hard/Expert: no damage); the damage is only dealt on a success, so the
// attack's damage is lowered for the test as the token is revealed. (Return to The Pallid Mask plays with this card.)
import {
  addTempMod,
  type CardScript,
  currentTest,
  type GameContext,
} from "../../../../src/engine/api";

function lessBy(game: GameContext, n: number) {
  const t = currentTest(game);
  if (t?.kind === "fight") addTempMod(game, { stat: "attackDamage", value: -n }, t.inv, "test");
}

export default {
  fns: {
    lessDamage: (game: GameContext) => lessBy(game, 1),
    noDamage: (game: GameContext) => lessBy(game, 99),
  },
} satisfies CardScript;
