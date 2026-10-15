import { describe, expect, it } from "vitest";
import { mapCard, parseKeywords, parseSlots, parseUses } from "../../scripts/import-cards";
import { db } from "../engine/testkit";
import { shuffle } from "../engine/rng";
import { cardText, t } from "./i18n";
import { buildContent } from "./loader";
import { CampaignDef, CardDef, DeckDef, Effect, InvestigatorDef, ScenarioDef } from "./schema";

describe("schemas", () => {
  it("accept a sample of each content type", () => {
    expect(CardDef.safeParse(db.cards["01088"]).success).toBe(true);
    expect(InvestigatorDef.safeParse(db.investigators["01001"]).success).toBe(true);
    expect(DeckDef.safeParse(db.decks["roland-starter"]).success).toBe(true);
    expect(ScenarioDef.safeParse(db.scenarios["the-gathering"]).success).toBe(true);
    expect(CampaignDef.safeParse(db.campaigns["night-of-the-zealot"]).success).toBe(true);
  });

  it("rejects an unknown effect", () => {
    expect(Effect.safeParse({ op: "gainResources", amount: 3 }).success).toBe(true);
    expect(Effect.safeParse({ op: "summonCthulhu", amount: 1 }).success).toBe(false);
  });
});

describe("loader", () => {
  const base = {
    "/content/packs/x/cards.generated.json": [{ code: "X1", name: "Thing", type: "event", faction: "neutral", pack: "x" }],
  };
  it("merges overrides over generated data", () => {
    const { db: d, errors } = buildContent({ ...base, "/content/packs/x/cards.json": { X1: { cost: 2 } } }, {});
    expect(errors).toEqual([]);
    expect(d.cards.X1.cost).toBe(2);
    expect(d.cards.X1.name).toBe("Thing");
  });

  it("reports a deck referencing a missing card with file and code", () => {
    const { errors } = buildContent(
      { ...base, "/content/decks/bad.json": { id: "bad", name: "Bad", investigator: "X1", cards: { "01999": 1 } } },
      {},
    );
    expect(errors).toContainEqual(expect.objectContaining({ file: "decks/bad.json", path: "cards.01999", message: "missing card 01999" }));
  });

  it("reports unknown effect ops with the field path", () => {
    const { errors } = buildContent({ ...base, "/content/packs/x/cards.json": { X1: { abilities: [{ kind: "onPlay", effects: [{ op: "nope" }] }] } } }, {});
    expect(errors[0]).toMatchObject({ file: "/content/packs/x/cards.json" });
    expect(errors[0].path).toMatch(/^X1\.abilities\.0\.effects\.0/);
  });
});

describe("ArkhamDB import mapping", () => {
  it("parses keywords, uses and slots", () => {
    expect(parseKeywords("<b>Prey</b> - Highest [combat].\nHunter. Retaliate.", "enemy")).toEqual(["hunter", "retaliate"]);
    expect(parseUses("Uses (4 ammo). [action] Spend 1 ammo")).toEqual({ type: "ammo", count: 4 });
    expect(parseSlots("Hand x2")).toEqual(["hand", "hand"]);
    expect(parseSlots("Hand. Arcane")).toEqual(["hand", "arcane"]);
  });

  it("maps a location with per-investigator clues", () => {
    const c = mapCard({ code: "01111", name: "Study", type_code: "location", faction_code: "mythos", pack_code: "core", shroud: 2, clues: 2, encounter_code: "torch", text: "" });
    expect(c).toMatchObject({ shroud: 2, clues: 2, cluesPerInvestigator: true, encounterSet: "torch" });
  });

  it("generated file holds every imported core card and overrides stay separate", () => {
    expect(Object.keys(db.cards).length).toBe(183);
    expect(db.cards["01006"].abilities.length).toBeGreaterThan(0); // from cards.json
  });
});

describe("i18n", () => {
  it("falls back to English when a translation is missing", () => {
    expect(cardText(db, "01006", "ru").name).toBe("Револьвер Роланда");
    // every core card is translated now: unknown locales and untranslated fields fall back
    expect(cardText(db, "01016", "xx").name).toBe(".45 Automatic");
    expect(cardText(db, "01111", "ru").text).toBe(db.cards["01111"].text);
    expect(t(db, "ru", "menu.start")).toBe("Начать");
    expect(t(db, "xx", "menu.start")).toBe("Start");
    expect(t(db, "en", "hud.passTo", { name: "Agnes" })).toBe("Pass to Agnes");
  });
});

describe("rng", () => {
  it("same seed gives the same shuffle", () => {
    const a = shuffle({ rng: 7 }, [...Array(30).keys()]);
    const b = shuffle({ rng: 7 }, [...Array(30).keys()]);
    const c = shuffle({ rng: 8 }, [...Array(30).keys()]);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });
});
