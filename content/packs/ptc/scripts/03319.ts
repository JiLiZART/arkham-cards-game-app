// Madness Dies (Dim Carcosa, agenda 3): Hastur gets +2 fight; he cannot be defeated unless an investigator "knows the
// secret" (the scenario's hook). Back (Earth and Carcosa): Resolution 4 with as much Conviction as Doubt, else 5.
import { type CardScript, type GameContext, queue, endScenario } from "../../../../src/engine/api";
import { convictionAtLeastDoubt } from "../../../campaigns/the-path-to-carcosa/scripts/dim-carcosa";
import { hasturFight } from "./03318";

export default {
  abilities: [{ kind: "revelation", run: "earthAndCarcosa" }],
  modifiers: hasturFight(2),
  fns: {
    earthAndCarcosa(game: GameContext) {
      queue(game, endScenario({ id: convictionAtLeastDoubt(game) ? "R4" : "R5" }));
    },
  },
} satisfies CardScript;
