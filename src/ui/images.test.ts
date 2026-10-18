import { describe, expect, it } from "vitest";
import { db } from "../engine/testkit";
import { cardImage, faceLines } from "./images";

describe("card images", () => {
  it("resolves front and back URLs", () => {
    expect(cardImage(db.cards["01116"], "front")).toBe("/cards/01116.webp");
    expect(cardImage(db.cards["01116"], "back")).toBeNull();
    expect(cardImage(db.cards["01111"], "back")).toBe("/cards/01111b.webp");
  });

  it("the table never gets a remote URL; an HTML view that asks for one gets the CDN for cards the game does not host", () => {
    const zoeysCross = { code: "02006", pack: "dwl", doubleSided: false } as never;
    const zoey = { code: "02001", pack: "dwl", doubleSided: true } as never;
    expect(cardImage(zoeysCross, "front")).toBe("/cards/02006.webp");
    expect(cardImage(zoeysCross, "front", "en", { remote: true })).toBe("https://cdn.arkham.build/optimized/02006.webp");
    expect(cardImage(zoey, "back", "en", { remote: true })).toBe("https://cdn.arkham.build/optimized/02001b.webp");
    expect(cardImage(zoeysCross, "back", "en", { remote: true })).toBeNull();
    // the core set is hosted: its scans stay local
    expect(cardImage(db.cards["01020"], "front", "en", { remote: true })).toBe("/cards/01020.webp");
    // a card with an image of its own keeps it
    expect(cardImage({ ...(zoeysCross as object), image: "https://x/y.webp" } as never, "front", "en", { remote: true })).toBe("https://x/y.webp");
    // Russian images are hosted and win
    expect(cardImage(db.cards["01020"], "front", "ru", { remote: true })).toBe(cardImage(db.cards["01020"], "front", "ru"));
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
