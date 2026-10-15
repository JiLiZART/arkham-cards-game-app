import { describe, expect, it, vi } from "vitest";
import { cardImage } from "./images";

// two imported Russian sides: Machete's front and the Study's back (its unrevealed side)
vi.mock("./ruImages.generated.json", () => ({ default: ["01020", "01111b"] }));

describe("Russian card images", () => {
  const machete = { code: "01020", doubleSided: false };
  const study = { code: "01111", doubleSided: true };
  it("ru with an imported image uses it, per side", () => {
    expect(cardImage(machete, "front", "ru")).toBe("/cards-ru/01020.webp");
    expect(cardImage(study, "back", "ru")).toBe("/cards-ru/01111b.webp");
  });
  it("ru without one, and every other locale, use the English scan", () => {
    expect(cardImage(study, "front", "ru")).toBe("/cards/01111.webp");
    expect(cardImage(machete, "front", "en")).toBe("/cards/01020.webp");
    expect(cardImage(machete, "front")).toBe("/cards/01020.webp");
    expect(cardImage(machete, "back", "ru")).toBeNull();
  });
});
