// Augur of Elokoss — a success with a symbol token revealed may discard a Terror or Hex treachery from any threat area
import {
  ask,
  type CardScript,
  cardsIn,
  currentTest,
  def,
  discard,
  type EffCtx,
  type GameContext,
  type InstId,
  type Step,
  ZONE,
  CHOICE,
} from "../../../../src/engine/api";

const SYMBOLS = ["skull", "cultist", "tablet", "elderThing", "elderSign", "autoFail"];

export default {
  fns: {
    augur(game: GameContext, ctx: EffCtx, _args: unknown, step?: Step) {
      if (!currentTest(game)?.tokens.some((t) => SYMBOLS.includes(t))) return;
      const pool = cardsIn(game, ZONE.Threat).filter(
        (c) =>
          def(game, c.id).type === "treachery" &&
          def(game, c.id).traits.some((t) => t === "Terror" || t === "Hex"),
      );
      if (!pool.length) return;
      const pick = ask<InstId | "none">(
        game,
        step!,
        ctx.you!,
        CHOICE.Generic,
        "Augur of Elokoss: discard a Terror or Hex treachery?",
        [
          ...pool.map((c) => ({ id: c.id, label: def(game, c.id).name, card: c.id, value: c.id })),
          { id: "none", label: "No", value: "none" },
        ],
        { key: "chooseOne" },
      );
      if (pick === undefined || pick === "none") return;
      discard(game, pick);
    },
  },
} satisfies CardScript;
