import { describe, expect, it } from "vitest";
import { content, loadAllPacks } from ".";
import { packLoaded } from "./loader";

describe("loadAllPacks", () => {
  it("loads every pack, reports progress to the last one, and a second call loads nothing more", async () => {
    const seen: [number, number][] = [];
    expect(await loadAllPacks((done, total) => seen.push([done, total]))).toEqual([]);
    const total = Object.keys(content.packs).length;
    expect(total).toBeGreaterThan(10);
    expect(Object.keys(content.packs).every((p) => packLoaded(content, p))).toBe(true);
    expect(seen[seen.length - 1]).toEqual([total, total]);
    expect(seen.map(([d]) => d)).toEqual(seen.map(([d]) => d).sort((a, b) => a - b));
    expect(Object.keys(content.cards).length).toBeGreaterThan(5800);
    const n = Object.keys(content.cards).length;
    await loadAllPacks();
    expect(Object.keys(content.cards)).toHaveLength(n);
  });
});
