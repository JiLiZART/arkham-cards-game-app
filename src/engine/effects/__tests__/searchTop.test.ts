import { describe, expect, it } from "vitest";
import { inv } from "../../context";
import { game, inject } from "../../kits/driver";
import { gOf } from "../../kits/testkit";
import { STEP } from "../../steps/step";

const ROLAND = "01001";
const offered = (top: number | "failBy", failBy?: number) => {
  const r0 = game({ investigators: [ROLAND] });
  const r = inject(r0, () => {}, {
    t: STEP.Eff,
    effect: { op: "searchDeck", top, filter: {}, draw: true },
    ctx: { you: ROLAND, ...(failBy !== undefined ? { failBy } : {}) },
  });
  const seen = [
    ...(r.state.pending?.options ?? []).map((o) => o.value),
    ...(r.state.pending?.shown ?? []),
  ].filter((v) => v !== "none");
  return { seen, deck: inv(gOf(r0), ROLAND).deck };
};

describe("searchDeck's top as an amount", () => {
  it("top: failBy searches as many cards as the test was failed by; a number still counts", () => {
    const four = offered("failBy", 4);
    expect([...four.seen].sort()).toEqual(four.deck.slice(0, 4).sort());
    const three = offered(3);
    expect([...three.seen].sort()).toEqual(three.deck.slice(0, 3).sort());
  });
});
