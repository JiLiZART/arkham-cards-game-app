import { describe, expect, it } from "vitest";
import { railItem } from "./ActionRail";

describe("railItem", () => {
  it("a waiting draw's button is the translated Draw, with the deck it draws from", () => {
    expect(railItem({ id: "draw", label: "Draw", value: "draw:player" })).toMatchObject({ key: "rail.draw", primary: true });
    expect(railItem({ id: "draw", label: "Draw", value: "draw:encounter" })).toMatchObject({ key: "rail.drawEncounter", primary: true });
  });
});
