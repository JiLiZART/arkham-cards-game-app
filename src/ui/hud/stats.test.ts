import { describe, expect, it } from "vitest";
import { giveCard, mutate, skipMulligans, start } from "../../engine/testkit";
import { HAND_LIMIT } from "../../engine/rules/investigators";
import { invNumbers } from "./Stats";

describe("invNumbers hand", () => {
  const roland = () => skipMulligans(start("the-gathering", ["01001"], 1));

  it("is the number of cards in hand, with the engine's hand limit", () => {
    const r = roland();
    const n = invNumbers(r.state, "01001");
    expect(n.hand).toBe(r.state.invs["01001"].hand.length);
    expect(n.handLimit).toBe(HAND_LIMIT);
    expect(HAND_LIMIT).toBe(8);
  });

  it("counts a card added to the hand", () => {
    let r = roland();
    const before = invNumbers(r.state, "01001").hand;
    r = mutate(r, (g) => {
      giveCard(g, "01001", "01088");
    });
    expect(invNumbers(r.state, "01001").hand).toBe(before + 1);
  });
});
