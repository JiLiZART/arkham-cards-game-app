import { describe, expect, it } from "vitest";
import type { ChoiceOption } from "../../engine/types";
import { abilitySymbol, stripAction } from "./ActionRail";
import { stripCardWidth } from "./Panels";

describe("strip card width", () => {
  it("full size when there is room, smaller when crowded, never below the minimum", () => {
    expect(stripCardWidth(980, 3, 0, 1)).toBe(124);
    expect(stripCardWidth(980, 8, 1, 1)).toBeLessThan(124);
    expect(stripCardWidth(300, 10, 2, 1)).toBe(84);
  });
});

describe("strip buttons", () => {
  const o = (label: string, value: unknown): ChoiceOption => ({ id: label, label, value }) as ChoiceOption;
  it("fight and evade get their icons; other labels lose the card name", () => {
    expect(stripAction(o("Fight Ghoul Minion", { kind: "fight", enemy: "c1" }), "Ghoul Minion", "en")).toEqual({ label: "Fight", icon: "combat" });
    expect(stripAction(o("Evade Ghoul Minion", { kind: "evade", enemy: "c1" }), "Ghoul Minion", "ru")).toEqual({ label: "Уклониться", icon: "agility" });
    expect(stripAction(o("Use .45 Automatic", {}), ".45 Automatic", "en")).toEqual({ label: "Use" });
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
    expect(abilitySymbol(o({ ability: { card: "gun", index: 0, ability: { kind: "fast" } } }), game)).toBe("free");
  });
  it("no symbol for options that aren't card abilities", () => {
    expect(abilitySymbol(o({ kind: "fight", enemy: "e1" }), game)).toBeNull();
    expect(abilitySymbol(o("pass"), game)).toBeNull();
    expect(abilitySymbol(o({ kind: "ability", card: "gone", index: 0 }), game)).toBeNull();
  });
});
