import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { InvestigatorDef } from "../src/content/schema";
import { mapInvestigator, mapOption, buildPackIndex, completeDecks, readNames, mapStarterDeck, parseRequirements, parseStarterDecks, readInvestigators } from "./import-investigators";

const zoey = {
  code: "02001", name: "Zoey Samaras", subname: "The Chef", type_code: "investigator", faction_code: "guardian", pack_code: "dwl",
  deck_requirements: "size:30, card:02006:90060, card:02007:90061, random:subtype:basicweakness",
  deck_options: [{ faction: ["guardian", "neutral"], level: { min: 0, max: 5 } }, { level: { min: 0, max: 0 }, limit: 5, error: "no" }],
};
const subtypes: Record<string, string | undefined> = { "02007": "weakness" };

describe("parseRequirements", () => {
  it("reads the size, the cards with their alternatives and the random weakness", () => {
    expect(parseRequirements(zoey.deck_requirements)).toEqual({
      size: 30,
      cards: [{ code: "02006", alternatives: ["90060"] }, { code: "02007", alternatives: ["90061"] }],
      randomWeakness: true,
    });
  });
  it("copes with no alternative and no random weakness", () => {
    expect(parseRequirements("size:40, card:01006")).toEqual({ size: 40, cards: [{ code: "01006", alternatives: [] }], randomWeakness: false });
  });
});

describe("mapOption", () => {
  it("keeps the keys of the grammar", () => {
    expect(mapOption({ trait: ["spell"], type: ["event"], level: { min: 0, max: 3 }, not: true })).toEqual({ trait: ["spell"], type: ["event"], level: { min: 0, max: 3 }, not: true });
  });
  it("keeps a key it does not know under raw", () => {
    expect(mapOption({ faction: ["rogue"], novelty: 1 })).toEqual({ faction: ["rogue"], raw: { novelty: 1 } });
  });
});

describe("mapInvestigator", () => {
  it("defines Zoey Samaras", () => {
    const def = mapInvestigator(zoey, (c) => subtypes[c]);
    expect(InvestigatorDef.parse(def)).toEqual(def);
    expect(def).toMatchObject({ code: "02001", name: "Zoey Samaras", subname: "The Chef", faction: "guardian", pack: "dwl", generated: true, deckSize: 30, signatures: ["02006"], weaknesses: ["02007"] });
    expect(def.alternatives).toEqual({ "02006": ["90060"], "02007": ["90061"] });
    expect(def.deckOptions[1]).toEqual({ level: { min: 0, max: 0 }, limit: 5, error: "no" });
  });
});

describe("readInvestigators", () => {
  const root = mkdtempSync(join(tmpdir(), "arkham-inv-"));
  mkdirSync(join(root, "pack", "dwl"), { recursive: true });
  const other = { ...zoey, code: "02002", name: "Rex" };
  writeFileSync(
    join(root, "pack", "dwl", "dwl.json"),
    JSON.stringify([
      zoey, other,
      { code: "02006", name: "Zoey's Cross", type_code: "asset", pack_code: "dwl" },
      { code: "02007", name: "Smite the Wicked", type_code: "treachery", subtype_code: "weakness", pack_code: "dwl" },
      { ...zoey, code: "90059", alternate_of: "02001" }, // a parallel front
      { ...zoey, code: "98001", hidden: true },
      { ...zoey, code: "05046", deck_requirements: undefined }, // not deckbuildable
    ]),
  );
  it("names the content pack of the card, the snapshot's folder, not its ArkhamDB pack code", () => {
    mkdirSync(join(root, "pack", "investigator"), { recursive: true });
    writeFileSync(join(root, "pack", "investigator", "nat.json"), JSON.stringify([{ ...zoey, code: "60101", pack_code: "nat" }]));
    expect(readInvestigators(root).find((d) => d.code === "60101")?.pack).toBe("investigator");
  });
  it("takes regular investigators only, and leaves the hand-written ones alone", () => {
    const defs = readInvestigators(root, new Set(["02002"]));
    expect(defs.map((d) => d.code).filter((c) => c !== "60101")).toEqual(["02001"]);
    expect(defs[0].weaknesses).toEqual(["02007"]);
  });
});

describe("starter decks", () => {
  const source = `const starterDecks = {
    meta: { '06002': { deck_size_selected: '30', faction_selected: 'rogue' } },
    cards: {
      // Zoey
      '02001': { '01000': 1, '02006': 1, '02007': 1, '01086': 2 },
      '02002': { '01009': 1 },
    },
  };`;
  it("parses the slot lists and skips the meta", () => {
    expect(parseStarterDecks(source)).toEqual({ "02001": { "01000": 1, "02006": 1, "02007": 1, "01086": 2 }, "02002": { "01009": 1 } });
  });
  it("turns the 01000 placeholder into a random basic weakness", () => {
    expect(mapStarterDeck("02001", "Zoey Samaras", { "01000": 1, "02006": 1, "01086": 2 })).toEqual({
      id: "02001-starter", name: "Zoey Samaras — Starter", investigator: "02001", cards: { "02006": 1, "01086": 2 }, randomBasicWeakness: true,
    });
  });
  it("points a reprint stub at the card it duplicates, adding up the copies", () => {
    expect(mapStarterDeck("1", "A", { "12020": 1, "01020": 1, "12024": 2 }, { "12020": "01020", "12024": "04103" }).cards).toEqual({ "01020": 2, "04103": 2 });
  });
  it("has no random weakness when the list has no placeholder", () => {
    expect(mapStarterDeck("02002", "Rex", { "01009": 1 }).randomBasicWeakness).toBe(false);
  });
});

describe("completeDecks", () => {
  it("drops a starter deck that names a card the snapshot does not have", () => {
    const a = mapStarterDeck("1", "A", { "10": 1 });
    const b = mapStarterDeck("2", "B", { "10": 1, "99": 2 });
    expect(completeDecks([a, b], new Set(["10"]))).toEqual([a]);
  });
});

describe("buildPackIndex", () => {
  it("lists a run of codes per pack, in code order, with the core reprints in packs of their own", () => {
    const rec = (code: string, _pack: string, type_code: string | null = "asset") => ({ code, _pack, type_code });
    expect(buildPackIndex([rec("02002", "dwl"), rec("01001", "core"), rec("02001", "dwl"), rec("12001", "core_2026"), rec("12020", "core_2026", null), rec("03001", "ptc")])).toEqual([
      ["01001", "01001", "core"],
      ["02001", "02002", "dwl"],
      ["03001", "03001", "ptc"],
      ["12001", "12001", "core_2026"],
    ]);
  });
});

describe("readNames", () => {
  it("collects each locale's imported name and subname of the investigators", () => {
    const root = mkdtempSync(join(tmpdir(), "arkham-i18n-"));
    mkdirSync(join(root, "ru", "packs"), { recursive: true });
    mkdirSync(join(root, "de", "packs"), { recursive: true });
    writeFileSync(join(root, "ru", "packs", "dwl.generated.json"), JSON.stringify({ "02001": { name: "Зои Самарас", subname: "Повар", text: "x" }, "02006": { name: "Крест Зои" } }));
    writeFileSync(join(root, "de", "packs", "dwl.generated.json"), JSON.stringify({ "02001": { name: "Zoey" } }));
    expect(readNames(root, new Set(["02001"]))).toEqual({ "02001": { ru: { name: "Зои Самарас", subname: "Повар" }, de: { name: "Zoey" } } });
  });
  it("is empty without translations", () => {
    expect(readNames(join(tmpdir(), "no-such-i18n-folder"), new Set(["02001"]))).toEqual({});
  });
});

describe("investigator names", () => {
  it("go onto the definition", () => {
    const def = mapInvestigator(zoey, (c) => subtypes[c], { ru: { name: "Зои Самарас" } });
    expect(InvestigatorDef.parse(def).names).toEqual({ ru: { name: "Зои Самарас" } });
  });
});
