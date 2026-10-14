import { describe, expect, it } from "vitest";
import { db } from "../engine/testkit";
import { cardImage, faceLines } from "./images";

describe("card images", () => {
  it("resolves front and back URLs", () => {
    expect(cardImage(db.cards["01116"], "front")).toBe("/cards/01116.webp");
    expect(cardImage(db.cards["01116"], "back")).toBeNull();
    expect(cardImage(db.cards["01111"], "back")).toBe("/cards/01111b.webp");
  });

  it("fallback face shows name, cost, icons and text", () => {
    const f = faceLines(db.cards["01016"], "front");
    expect(f.title).toBe(".45 Automatic");
    expect(f.stats).toMatch(/Cost 4/);
    expect(f.stats).toMatch(/AGI×1/);
    expect(f.body.join(" ")).toMatch(/Uses \(4 ammo\)/);
    expect(faceLines(db.cards["01116"], "front").stats).toMatch(/Fight 4 · HP 5\/inv · Evade 4/);
  });
});
