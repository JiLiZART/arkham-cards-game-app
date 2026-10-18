import { beforeAll, describe, expect, it } from "vitest";
import { cardText } from "../../content/i18n";
import { loadContentFromDisk } from "../../content/node";
import type { ContentDb } from "../../engine/types";
import { catalogCards, cyclesOfCards, emptyFilters, normalise, packsOfCards, tabOf, traitsOf, type CatalogFilters } from "./filter";
import { implemented } from "./implemented";

let db: ContentDb;
beforeAll(async () => {
  db = (await loadContentFromDisk()).db;
});
const find = (f: Partial<CatalogFilters>, locale = "en") => catalogCards(db, locale, { ...emptyFilters, ...f });
const codes = (cs: { code: string }[]) => cs.map((c) => c.code);

describe("which tab a card belongs to", () => {
  it("investigators, player cards and encounter cards", () => {
    expect(tabOf(db.cards["01001"])).toBe("investigators");
    expect(tabOf(db.cards["01020"])).toBe("player");
    expect(tabOf(db.cards["01007"])).toBe("player"); // a weakness is a player card
    expect(tabOf(db.cards["01104"])).toBe("encounter"); // an act of the Gathering
  });
});

describe("catalog filters", () => {
  it("each tab lists only its cards, the core set first", () => {
    const inv = find({ tab: "investigators" });
    expect(inv.every((c) => c.type === "investigator")).toBe(true);
    expect(codes(find({ tab: "player" }))[0]).toBe("01006");
    expect(find({ tab: "encounter" }).every((c) => c.faction === "mythos")).toBe(true);
  });

  it("level 0 Seeker allies: only those, with their count", () => {
    const list = find({ tab: "player", factions: ["seeker"], types: ["asset"], levels: [0], traits: ["Ally"] });
    expect(list.length).toBeGreaterThan(3);
    for (const c of list) {
      expect(c.faction).toBe("seeker");
      expect(c.type).toBe("asset");
      expect(c.xp ?? 0).toBe(0);
      expect(c.traits).toContain("Ally");
    }
    // the same cards by hand
    const by = Object.values(db.cards).filter((c) => c.faction === "seeker" && c.type === "asset" && (c.xp ?? 0) === 0 && c.traits.includes("Ally"));
    expect(list).toHaveLength(by.length);
  });

  it("filters by cost, skill icon, slot, pack and cycle", () => {
    expect(find({ tab: "player", costs: [3], types: ["asset"] }).every((c) => c.cost === 3)).toBe(true);
    expect(find({ tab: "player", icons: ["agility"] }).every((c) => (c.icons.agility ?? 0) > 0)).toBe(true);
    expect(find({ tab: "player", slots: ["arcane"] }).every((c) => c.slots.includes("arcane"))).toBe(true);
    expect(find({ tab: "player", cycles: ["dwl"] }).every((c) => c.code.startsWith("02"))).toBe(true);
    expect(codes(find({ tab: "investigators", packs: ["dwl"] }))).toContain("02001");
  });

  it("filters the encounter cards by encounter set", () => {
    const list = find({ tab: "encounter", sets: ["rats"] });
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((c) => c.encounterSet === "rats")).toBe(true);
  });

  it("filters by whether the card works in the game", () => {
    expect(find({ tab: "player", works: "yes" }).every((c) => implemented(db, c.code))).toBe(true);
    expect(find({ tab: "player", works: "no" }).every((c) => !implemented(db, c.code))).toBe(true);
  });

  it("searches name, traits and text, and combines with the other filters", () => {
    expect(codes(find({ tab: "player", query: "machete" }))).toContain("01020");
    expect(codes(find({ tab: "player", query: "weapon melee", types: ["asset"] }))).toContain("01020");
    expect(codes(find({ tab: "player", query: "zzzz-no-card" }))).toEqual([]);
    expect(codes(find({ tab: "player", query: "machete", factions: ["seeker"] }))).not.toContain("01020");
  });

  it("searches in Russian: фонарь finds Flashlight", () => {
    expect(codes(find({ tab: "player", query: "фонарь" }, "ru"))).toContain("01087");
    expect(cardText(db, "01087", "ru").name.toLowerCase()).toContain("фонар");
  });

  it("offers the traits, packs and cycles of the cards it was given", () => {
    const some = find({ tab: "player", factions: ["seeker"] });
    expect(traitsOf(db, "en", some)).toContain("Ally");
    expect(traitsOf(db, "en", some)).toEqual([...traitsOf(db, "en", some)].sort());
    expect(packsOfCards(some)).toContain("core");
    expect(cyclesOfCards(db, some)).toContain("dwl");
  });

  it("ignores case, accents and ё", () => {
    expect(normalise("Ёлка <b>Ab</b> [action]")).toBe("елка ab action");
  });
});

describe("works in the game", () => {
  it("a core card with written behaviour works", () => {
    expect(implemented(db, "01020")).toBe(true); // Machete
  });
  it("a card of a later cycle without written behaviour is text only", () => {
    expect(implemented(db, "02006")).toBe(false); // Zoey's Cross
  });
  it("a card with no rules text or only keywords works", () => {
    const vanilla = Object.values(db.cards).find((c) => ["asset", "event", "skill", "enemy"].includes(c.type) && !c.text.replace(/<[^>]+>/g, "").trim() && !c.abilities.length && !db.scripts[c.code])!;
    expect(vanilla).toBeDefined();
    expect(implemented(db, vanilla.code)).toBe(true);
    const keywordOnly = Object.values(db.cards).find((c) => c.type === "enemy" && /^(Hunter\.?\s*)+$/.test(c.text.trim()) && !c.abilities.length);
    if (keywordOnly) expect(implemented(db, keywordOnly.code)).toBe(true);
  });
  it("an unknown code does not work", () => {
    expect(implemented(db, "nope")).toBe(false);
  });
});
