import { describe, expect, it } from "vitest";
import { content, loadPack } from "./index";
import { addPack, buildContent, cardsOf, packLoaded } from "./loader";
import { loadContentFromDisk } from "./node";

const card = (code: string, extra: object = {}) => ({ code, name: `Card ${code}`, type: "asset", faction: "neutral", pack: "x", quantity: 1, traits: [], text: "", ...extra });

describe("packs in the content database", () => {
  it("the browser's first load has the core pack, and the other packs known but not loaded", () => {
    expect(packLoaded(content, "core")).toBe(true);
    expect(cardsOf(content, "core")).toHaveLength(183);
    expect(Object.keys(content.packs)).toContain("dwl");
    expect(packLoaded(content, "dwl")).toBe(false);
    expect(content.cards["02001"]).toBeUndefined();
    expect(Object.values(content.cards).every((c) => c.pack === "core")).toBe(true);
  });

  it("loadPack brings a pack in on demand: Zoey Samaras exists afterwards, and asking again changes nothing", async () => {
    expect(await loadPack("dwl")).toEqual([]);
    expect(packLoaded(content, "dwl")).toBe(true);
    expect(content.cards["02001"]).toMatchObject({ name: "Zoey Samaras", type: "investigator" });
    expect(cardsOf(content, "dwl").some((c) => c.code === "02001")).toBe(true);
    const n = Object.keys(content.cards).length;
    expect(await loadPack("dwl")).toEqual([]);
    expect(Object.keys(content.cards)).toHaveLength(n);
    // its encounter sets joined the database too
    expect(Object.keys(content.encounterSets).some((s) => content.encounterSets[s].some((c) => c.startsWith("021")))).toBe(true);
  });

  it("an unknown pack is refused in plain words", async () => {
    await expect(loadPack("nope")).rejects.toThrow(/unknown pack nope/);
  });

  it("addPack validates what it adds: a bad card is reported with its code and the good ones are kept", () => {
    const db = buildContent({}, {}, ["x"]).db;
    expect(packLoaded(db, "x")).toBe(false);
    const errors = addPack(db, "x", [card("1"), card("2", { type: "nonsense" })], {});
    expect(errors.map((e) => e.path.split(".")[0])).toContain("2");
    expect(packLoaded(db, "x")).toBe(true);
    expect(cardsOf(db, "x").map((c) => c.code)).toEqual(["1"]);
  });

  it("an override applies to its pack's card, and one for an unknown card is an error", () => {
    const db = buildContent({}, {}, ["x"]).db;
    const errors = addPack(db, "x", [card("1")], { "1": { keywords: ["fast"] }, "9": {} });
    expect(db.cards["1"].keywords).toEqual(["fast"]);
    expect(errors.some((e) => /unknown card 9/.test(e.message))).toBe(true);
  });

  it("check:content's loader builds every pack eagerly", async () => {
    const { db, errors } = await loadContentFromDisk();
    expect(errors).toEqual([]);
    expect(Object.values(db.packs).every((p) => p.loaded)).toBe(true);
    expect(Object.keys(db.cards).length).toBeGreaterThan(5800);
    expect(db.cards["02001"].name).toBe("Zoey Samaras");
  });
});
