// Augur of Elokoss — a success with a symbol token revealed may discard a Terror or Hex treachery from any threat area
import {
  ask,
  cardsIn,
  def,
  discard,
  type CardScript,
  type EffCtx,
  type G,
  type InstId,
  type Step,
} from "../../../../src/engine/api";

const SYMBOLS = ["skull", "cultist", "tablet", "elderThing", "elderSign", "autoFail"];

export default {
  fns: {
    augur(g: G, ctx: EffCtx, _args: unknown, step?: Step) {
      if (!g.s.skillTest?.tokens.some((t) => SYMBOLS.includes(t))) return;
      const pool = cardsIn(g, "threat").filter(
        (c) =>
          def(g, c.id).type === "treachery" &&
          def(g, c.id).traits.some((t) => t === "Terror" || t === "Hex"),
      );
      if (!pool.length) return;
      const pick = ask<InstId | "none">(
        g,
        step!,
        ctx.you!,
        "generic",
        "Augur of Elokoss: discard a Terror or Hex treachery?",
        [
          ...pool.map((c) => ({ id: c.id, label: def(g, c.id).name, card: c.id, value: c.id })),
          { id: "none", label: "No", value: "none" },
        ],
        { key: "chooseOne" },
      );
      if (pick === undefined || pick === "none") return;
      discard(g, pick);
    },
  },
} satisfies CardScript;
