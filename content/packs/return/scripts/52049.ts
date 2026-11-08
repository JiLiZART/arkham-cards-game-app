// Secret Passage (Return to The Pallid Mask; a Catacombs location) — [action] with the Clasp of Black Onyx under your
// control: reveal the Catacombs to its right. Forced: when it is revealed, the topmost Catacombs goes into play to its
// right.
import {
  card,
  type CardScript,
  cellOf,
  type GameContext,
  locationAt,
  queue,
  revealLocation,
  type ScriptRun,
} from "../../../../src/engine/api";
import { catacombsEach } from "../../../campaigns/the-path-to-carcosa/scripts/the-pallid-mask";

const CLASP = "03142";

export default {
  abilities: [
    {
      kind: "action",
      usableBy: "atLocation",
      label: "Secret Passage: place the clasp to reveal the Catacombs to its right",
      condition: { all: [{ controlsCard: CLASP }, { script: "hiddenRight" }] },
      run: "open",
    },
    { kind: "forced", trigger: "revealed", run: "reveal" },
  ],
  conditions: {
    hiddenRight: (game: GameContext, ctx) => {
      const right = ctx.source ? toTheRight(game, ctx.source) : null;
      return !!right && !card(game, right).revealed;
    },
  },
  fns: {
    open(game: GameContext, run: ScriptRun) {
      const right = toTheRight(game, run.source);
      if (right) queue(game, revealLocation(right));
    },
    reveal(game: GameContext, run: ScriptRun) {
      catacombsEach(game, run.source, ["right"]);
    },
  },
} satisfies CardScript;

function toTheRight(game: GameContext, self: string) {
  const here = cellOf(game, self);
  return here ? locationAt(game, [here[0] + 1, here[1]]) : null;
}
