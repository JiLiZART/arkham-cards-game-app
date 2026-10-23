import { describe, expect, it } from "vitest";
import type { ChoiceOption } from "../../engine/types";
import { abilitySymbol, stripAction } from "./ActionRail";
import { columnCardWidth, pileIcon, stripButtonsFor, stripOrder } from "./Panels";

describe("strip column card width", () => {
  const ROOM = 520; // the column's height at 1600x900

  it("full size when they all fit", () => {
    expect(columnCardWidth(ROOM, 3, 0, 1)).toBe(92);
  });

  it("smaller when crowded, between the sizes", () => {
    const w = columnCardWidth(ROOM, 4, 0, 1);
    expect(w).toBeGreaterThan(72);
    expect(w).toBeLessThan(92);
    // what it chose does fit: four upright cards, three gaps and a divider with a gap each side
    expect(4 * 1.4 * w + 3 * 8 + 2 * 8 + 14).toBeLessThanOrEqual(ROOM);
  });

  it("never below 72: past that the column scrolls", () => {
    expect(columnCardWidth(ROOM, 10, 2, 1)).toBe(72);
  });

  it("an exhausted card lies sideways and takes only its width in height", () => {
    expect(columnCardWidth(ROOM, 2, 2, 0)).toBeGreaterThan(columnCardWidth(ROOM, 4, 0, 0));
  });
});

describe("strip buttons", () => {
  const o = (label: string, value: unknown): ChoiceOption =>
    ({ id: label, label, value }) as ChoiceOption;
  it("fight and evade get their icons; other labels lose the card name", () => {
    expect(
      stripAction(o("Fight Ghoul Minion", { kind: "fight", enemy: "c1" }), "Ghoul Minion", "en"),
    ).toEqual({ label: "Fight", icon: "combat" });
    expect(
      stripAction(o("Evade Ghoul Minion", { kind: "evade", enemy: "c1" }), "Ghoul Minion", "ru"),
    ).toEqual({ label: "Уклониться", icon: "agility" });
    expect(stripAction(o("Use .45 Automatic", {}), ".45 Automatic", "en")).toEqual({
      label: "Use",
    });
    expect(stripAction(o("Machete: fight", {}), "Machete", "en")).toEqual({ label: "Fight" });
  });
});

describe("ability symbols", () => {
  const game = { cards: { gun: { code: "01016" }, roland: { code: "01001" } } } as never;
  const o = (value: unknown): ChoiceOption => ({ id: "x", label: "x", value }) as ChoiceOption;
  it("an action ability (.45 Automatic's fight) shows the action symbol", () => {
    expect(abilitySymbol(o({ kind: "ability", card: "gun", index: 0 }), game)).toBe("action");
  });
  it("a reaction (Roland's) shows the reaction symbol; a fast ability in a test shows free", () => {
    expect(abilitySymbol(o("roland:0"), game)).toBe("reaction");
    expect(
      abilitySymbol(o({ ability: { card: "gun", index: 0, ability: { kind: "fast" } } }), game),
    ).toBe("free");
  });
  it("no symbol for options that aren't card abilities", () => {
    expect(abilitySymbol(o({ kind: "fight", enemy: "e1" }), game)).toBeNull();
    expect(abilitySymbol(o("pass"), game)).toBeNull();
    expect(abilitySymbol(o({ kind: "ability", card: "gone", index: 0 }), game)).toBeNull();
  });
});

describe("encounter pile badges", () => {
  const game = { scenarioId: "the-gathering", cards: { r: { code: "01163" } } } as never;
  it("a face-down pile shows the scenario's icon; a face-up one its top card's set", () => {
    expect(pileIcon(null, false, game)).toBe("the_gathering");
    expect(pileIcon("r", false, game)).toBe("the_gathering");
    expect(pileIcon("r", true, game)).toBe("striking_fear");
    expect(pileIcon(null, true, game)).toBe("the_gathering");
  });
});

describe("strip order", () => {
  it("the engaged enemies and threat-area cards come first, then a divider, then the assets", () => {
    expect(stripOrder(["a1", "a2"], ["t1", "e1"])).toEqual({
      cards: ["t1", "e1", "a1", "a2"],
      dividerAt: 2,
    });
  });

  it("no divider when only one kind is in play", () => {
    expect(stripOrder(["a1", "a2"], [])).toEqual({ cards: ["a1", "a2"], dividerAt: null });
    expect(stripOrder([], ["e1"])).toEqual({ cards: ["e1"], dividerAt: null });
  });
});

describe("which strip card shows its buttons", () => {
  const opts = new Map([
    ["a", [{ id: "x" }]],
    ["b", [{ id: "y" }, { id: "z" }]],
    ["c", []],
  ]);

  it("the hovered card, when it has options", () => {
    expect(stripButtonsFor("b", opts)).toBe("b");
  });

  it("none for a card with nothing to offer, or when nothing is hovered", () => {
    expect(stripButtonsFor("c", opts)).toBeNull();
    expect(stripButtonsFor("zz", opts)).toBeNull();
    expect(stripButtonsFor(null, opts)).toBeNull();
  });
});
