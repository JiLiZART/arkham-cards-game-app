import { describe, expect, it } from "vitest";
import { db } from "../engine/testkit";
import { cardDetails } from "./details";
import { keywordsOf } from "./glossary";

describe("keywordsOf", () => {
  it("finds the keywords in the card's keyword list, its text, its uses and its victory points", () => {
    // Ghoul Priest: Hunter and Retaliate in its text, Victory 2
    expect(keywordsOf(db.cards["01116"])).toEqual(["hunter", "retaliate", "victory"]);
    // Flashlight: Uses (3 supplies)
    expect(keywordsOf(db.cards["01087"])).toEqual(["uses"]);
  });

  it("reads keyword lines of later cycles' text: Patrol, Concealed, Swarming", () => {
    const card = (text: string) => ({ keywords: [], text }) as never;
    expect(keywordsOf(card("Alert. Patrol (nearest location with at least 1 memory). Retaliate."))).toEqual(["retaliate", "alert", "patrol"]);
    expect(keywordsOf(card("Concealed 1 [per_investigator]. Retaliate."))).toEqual(["retaliate", "concealed"]);
    expect(keywordsOf(card("Hunter. Swarming 6. <b>Forced</b> - After it enters play…"))).toEqual(["hunter", "swarming"]);
  });

  it("a keyword word inside a sentence is not a keyword", () => {
    expect(keywordsOf({ keywords: [], text: "Play only during your turn. If the enemy is a hunter, it moves fast." } as never)).toEqual([]);
  });

  it("a card without keywords has none", () => {
    // Machete
    expect(keywordsOf(db.cards["01020"])).toEqual([]);
  });
});

describe("the glossary in the card details", () => {
  it("the Ghoul Priest's details end with its keywords explained, in Russian with the Russian names", () => {
    const rows = cardDetails(db, "01116", "ru");
    const last = rows.at(-1)!;
    expect(last.k).toBe("keywords");
    const items = (last as { items: { name: string; text: string }[] }).items;
    expect(items.map((i) => i.name)).toEqual(["Охотник", "Мститель", "Победа"]);
    expect(items.every((i) => i.text.length > 20)).toBe(true);
  });

  it("the Machete's details have no glossary", () => {
    expect(cardDetails(db, "01020", "en").some((r) => r.k === "keywords")).toBe(false);
  });
});
