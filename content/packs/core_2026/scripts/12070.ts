// Augur of Elokoss — a success with a symbol token revealed may discard a Terror or Hex treachery from any threat area
import {
  type CardScript,
  cardsIn,
  currentTest,
  def,
  discard,
  type GameContext,
  type InstId,
  ZONE,
  CHOICE,
  type ScriptRun,
} from "../../../../src/engine/api";

const SYMBOLS = ["skull", "cultist", "tablet", "elderThing", "elderSign", "autoFail"];

export default {
  fns: {
    augur(game: GameContext, run: ScriptRun) {
      if (!currentTest(game)?.tokens.some((t) => SYMBOLS.includes(t))) return;
      const pool = cardsIn(game, ZONE.Threat).filter(
        (c) =>
          def(game, c.id).type === "treachery" &&
          def(game, c.id).traits.some((t) => t === "Terror" || t === "Hex"),
      );
      if (!pool.length) return;
      const pick = run.choose<InstId | "none">(
        [
          ...pool.map((c) => ({ id: c.id, label: def(game, c.id).name, card: c.id, value: c.id })),
          { id: "none", label: "No", value: "none" },
        ],
        { text: "Augur of Elokoss: discard a Terror or Hex treachery?", key: "chooseOne" },
        { auto: false, kind: CHOICE.Generic },
      );
      if (pick === "none") return;
      discard(game, pick);
    },
  },
} satisfies CardScript;
