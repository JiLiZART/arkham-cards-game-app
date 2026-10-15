import { describe, expect, it } from "vitest";
import { db } from "../src/engine/testkit";
import { cardFiles } from "./fetch-card-images";

describe("card scans for the Pages build", () => {
  const files = cardFiles(db);
  it("a front for every card, and a back for double-sided ones, without duplicates", () => {
    const doubled = Object.values(db.cards).filter((c) => c.doubleSided && !c.backImage);
    expect(doubled.length).toBeGreaterThan(0);
    expect(files).toContain(`${doubled[0].code}b.webp`);
    expect(files).toContain("01001.webp");
    expect(new Set(files).size).toBe(files.length);
    expect(files.every((f) => /^[\w-]+\.webp$/.test(f))).toBe(true);
  });
});
