import { describe, expect, it } from "vitest";
import { inv, tokensOn } from "../context";
import { game, inject, toTurn } from "../kits/driver";
import { gOf } from "../kits/testkit";
import { checkCondition } from "../queries";
import { amt } from "../effects/targets";
import { moveCard } from "../movement";
import { STEP } from "../steps/step";
import { ZONE } from "../world/constants";

const ROLAND = "01001";
const ctx = { you: ROLAND };

describe("named tokens", () => {
  it("2 wards placed on your location are held there, and a condition and an amount read them by name", () => {
    let r = game({ investigators: [ROLAND] });
    r = toTurn(
      inject(r, () => {}, {
        t: STEP.Eff,
        effect: { op: "placeTokens", on: "yourLocation", name: "ward", amount: 2 },
        ctx,
      }),
    );
    const g = gOf(r);
    const here = inv(g, ROLAND).location!;
    expect(tokensOn(g, here, "ward")).toBe(2);
    expect(checkCondition(g, { tokens: { name: "ward", on: "yourLocation", min: 2 } }, ctx)).toBe(
      true,
    );
    expect(checkCondition(g, { tokens: { name: "ward", on: "yourLocation", min: 3 } }, ctx)).toBe(
      false,
    );
    expect(amt(g, { tokensOn: { name: "ward", on: "yourLocation" } }, ctx)).toBe(2);
  });

  it("an investigator holds named tokens too; they can be removed and moved", () => {
    let r = game({ investigators: [ROLAND] });
    r = inject(r, () => {}, {
      t: STEP.Eff,
      effect: { op: "placeTokens", on: "you", name: "scrap", amount: 3 },
      ctx,
    });
    r = inject(r, () => {}, {
      t: STEP.Eff,
      effect: { op: "removeTokens", on: "you", name: "scrap", amount: 1 },
      ctx,
    });
    r = toTurn(
      inject(r, () => {}, {
        t: STEP.Eff,
        effect: { op: "moveTokens", name: "scrap", amount: 1, from: "you", to: "yourLocation" },
        ctx,
      }),
    );
    const g = gOf(r);
    expect(tokensOn(g, ROLAND, "scrap")).toBe(1);
    expect(tokensOn(g, inv(g, ROLAND).location!, "scrap")).toBe(1);
  });

  it("a card leaving play loses its named tokens", () => {
    let here = "";
    let r = game({ investigators: [ROLAND], prep: (g) => (here = inv(g, ROLAND).location!) });
    r = inject(r, () => {}, {
      t: STEP.Eff,
      effect: { op: "placeTokens", on: "yourLocation", name: "ward", amount: 2 },
      ctx,
    });
    r = inject(r, (g) => moveCard(g, here, ZONE.EncounterDiscard));
    expect(tokensOn(gOf(r), here, "ward")).toBe(0);
  });
});
