// Stone Archways (The Pallid Mask) — the text of the unrevealed locations beside it is ignored (their Catacombs side:
// the clue cost to enter). Forced: when it is revealed, the topmost Catacombs goes into play to its right.
import {
  adjacent,
  card,
  type CardScript,
  type GameContext,
  type InstId,
  type ScriptRun,
} from "../../../../src/engine/api";
import { catacombsEach } from "../../../campaigns/the-path-to-carcosa/scripts/the-pallid-mask";

export default {
  abilities: [{ kind: "forced", trigger: "revealed", run: "reveal" }],
  modifiers(game: GameContext, self: InstId) {
    if (!card(game, self).revealed || card(game, self).zone !== "location") return [];
    return adjacent(game, self)
      .filter((l) => !card(game, l).revealed)
      .map((l) => ({ target: l, mod: { flag: "ignoreUnrevealedText" as const } }));
  },
  fns: {
    reveal(game: GameContext, run: ScriptRun) {
      catacombsEach(game, run.source, ["right"]);
    },
  },
} satisfies CardScript;
