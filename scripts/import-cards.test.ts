import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CardDef } from "../src/content/schema";
import { mapCard, mapSnapshotPack, readSnapshot, snapshotTarget } from "./import-cards";

const roland = {
  code: "01001", name: "Roland Banks", type_code: "investigator", faction_code: "guardian", pack_code: "core", position: 1, quantity: 1, is_unique: true,
  health: 9, sanity: 5, skill_willpower: 3, skill_intellect: 3, skill_combat: 4, skill_agility: 2, traits: "Agency. Detective.", text: "Test.",
};
const zoey = { ...roland, code: "02001", name: "Zoey Samaras", faction_code: "guardian", pack_code: "dwl", traits: "Believer. Hunter." };
/** the snapshot's bare reprint records: a code that points at the original, with no name or type */
const stub = { code: "01501", pack_code: "rcore", duplicate_of: "01001", alternate_of: "01001", illustrator: "X", position: 1, quantity: 1 };

/** a snapshot folder: pack/<folder>/<file>.json */
function snapshot(files: Record<string, unknown[]>) {
  const root = mkdtempSync(join(tmpdir(), "arkham-snapshot-"));
  for (const [path, cards] of Object.entries(files)) {
    mkdirSync(join(root, "pack", path.split("/")[0]), { recursive: true });
    writeFileSync(join(root, "pack", path), JSON.stringify(cards));
  }
  return root;
}

describe("a snapshot record", () => {
  it("maps like an API record, through the same mapCard", () => {
    const c = mapCard(zoey);
    expect(CardDef.safeParse(c).success).toBe(true);
    expect(c).toMatchObject({ code: "02001", name: "Zoey Samaras", type: "investigator", faction: "guardian", pack: "dwl", unique: true });
  });

  it("the card types and the Head slot of later cycles parse", () => {
    for (const type_code of ["story", "key", "enemy_location"]) {
      const c = { code: "99001", name: "X", type_code, faction_code: "mythos", pack_code: "dwl", quantity: 1, text: "" };
      expect(CardDef.safeParse(mapCard(c)).success, type_code).toBe(true);
    }
    const mask = { code: "12068", name: "Mask of Silenus", type_code: "asset", faction_code: "neutral", pack_code: "core_2026", quantity: 1, slot: "Head", cost: 1, text: "" };
    expect(mapCard(mask).slots).toEqual(["head"]);
    expect(CardDef.safeParse(mapCard(mask)).success).toBe(true);
  });
});

describe("snapshotTarget", () => {
  it("a pack is its folder; the core folder's reprints are packs of their own so the core pack stays the original 183", () => {
    expect(snapshotTarget("dwl", "wda")).toBe("dwl");
    expect(snapshotTarget("core", "core")).toBe("core");
    expect(snapshotTarget("core", "rcore")).toBe("rcore");
    expect(snapshotTarget("core", "core_2026")).toBe("core_2026");
  });
});

describe("readSnapshot", () => {
  it("--all: every folder under pack/ becomes a pack, sorted by code, with the bare reprint stubs and the placeholder left out", () => {
    const root = snapshot({
      "core/core.json": [{ ...roland, code: "01002" }, { ...roland, code: "01000", name: "Random Basic Weakness", type_code: "treachery", faction_code: "neutral" }, roland],
      "core/rcore.json": [stub],
      "dwl/dwl.json": [zoey],
      "dwl/dwl_encounter.json": [{ code: "02101", name: "A Place", type_code: "location", faction_code: "mythos", pack_code: "dwl", quantity: 1, text: "", shroud: 1, clues: 0 }],
      "parallel/pnr.json": [{ ...zoey, code: "90001", pack_code: "pnr" }],
    });
    const packs = readSnapshot(root);
    expect([...packs.keys()].sort()).toEqual(["core", "dwl", "parallel"]);
    expect(packs.get("core")!.map((c) => c.code)).toEqual(["01001", "01002"]);
    expect(packs.get("dwl")!.map((c) => c.code)).toEqual(["02001", "02101"]);
  });

  it("--cycle: just the named folder; an unknown one is an error that says what exists", () => {
    const root = snapshot({ "dwl/dwl.json": [zoey], "ptc/ptc.json": [{ ...zoey, code: "03001", pack_code: "ptc" }] });
    expect([...readSnapshot(root, "ptc").keys()]).toEqual(["ptc"]);
    expect(() => readSnapshot(root, "nope")).toThrow(/dwl, ptc/);
  });
});

describe("mapSnapshotPack", () => {
  it("a record that fails the schema is reported with its code and the cards that pass are kept", () => {
    const bad = { code: "02999", name: "Broken", type_code: "asset", faction_code: "neutral", pack_code: "dwl", quantity: 1, slot: "Elbow", text: "" };
    const { cards, problems } = mapSnapshotPack([zoey, bad]);
    expect(cards.map((c) => c.code)).toEqual(["02001"]);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatchObject({ code: "02999" });
    expect(problems[0].message).toMatch(/slots/);
  });
});

describe("tags", () => {
  it("keeps the ArkhamDB tags of a card for the deckbuilding options that name them", () => {
    expect(mapCard({ ...roland, code: "09999", type_code: "asset", tags: "hd.hh." }).tags).toEqual(["hd", "hh"]);
    expect(mapCard({ ...roland, code: "09998", type_code: "asset" }).tags).toBeUndefined();
  });
});
