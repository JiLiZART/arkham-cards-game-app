import { describe, expect, it } from "vitest";
import { campaignLoaded, content, contentErrors, loadCampaign, loadPack, packsOf } from ".";
import { cardText } from "./i18n";
import { addCardText, addPack, buildContent, cardsOf, packLoaded, packOfCode } from "./loader";
import { loadContentFromDisk } from "./node";

const card = (code: string, extra: object = {}) => ({
  code,
  name: `Card ${code}`,
  type: "asset",
  faction: "neutral",
  pack: "x",
  quantity: 1,
  traits: [],
  text: "",
  ...extra,
});

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
    expect(
      Object.keys(content.encounterSets).some((s) =>
        content.encounterSets[s].some((c) => c.startsWith("021")),
      ),
    ).toBe(true);
  });

  it("a pack's Russian text comes with it: Zoey's name and text are the snapshot's, English until then and for anything untranslated", async () => {
    await loadPack("dwl");
    expect(cardText(content, "02001", "ru")).toMatchObject({
      name: "Зои Самарас",
      subname: "Повар",
    });
    expect(cardText(content, "02001", "ru").text).toMatch(/Получите 1 ресурс/);
    expect(cardText(content, "02001", "en").name).toBe("Zoey Samaras");
    // the core pack keeps its layers: print-matched text over imported text
    expect(cardText(content, "01006", "ru").name).toBe("Револьвер Роланда");
  });

  it("text loaded late never overwrites a higher layer already there (print-matched or hand-written)", () => {
    const db = buildContent({}, {}, []).db;
    addCardText(
      db,
      "ru",
      "/content/i18n/ru/cards.print.json",
      { "1": { name: "Напечатано" } },
      1,
      false,
    );
    addCardText(
      db,
      "ru",
      "/content/i18n/ru/packs/x.generated.json",
      { "1": { name: "Импорт", text: "Текст" }, "2": { name: "Два" } },
      0,
      true,
    );
    expect(db.i18n.ru.cards["1"]).toEqual({ name: "Напечатано", text: "Текст" });
    expect(db.i18n.ru.cards["2"]).toEqual({ name: "Два" });
  });

  it("the browser's content has no errors although the generated campaigns' scenarios and cards are not loaded yet", () => {
    expect(content.campaigns["the-dunwich-legacy"]).toMatchObject({
      generated: true,
      packs: ["core", "dwl"],
      card: "02041",
    });
    expect(content.scenarios["extracurricular-activity"]).toBeUndefined();
    expect(campaignLoaded("the-dunwich-legacy")).toBe(false);
    expect(campaignLoaded("night-of-the-zealot")).toBe(true);
    expect(contentErrors).toEqual([]);
  });

  it("loadCampaign brings a generated campaign's scenarios and Russian text in", async () => {
    expect(await loadCampaign("the-dunwich-legacy")).toEqual([]);
    expect(campaignLoaded("the-dunwich-legacy")).toBe(true);
    expect(content.scenarios["extracurricular-activity"].card).toBe("02041");
    expect(content.i18n.ru.campaigns.scenarios["extracurricular-activity"].name).toMatch(/[а-я]/i);
    await expect(loadCampaign("nowhere")).rejects.toThrow(/unknown campaign nowhere/);
  });

  it("a scenario's references are checked once its campaign's packs are loaded", () => {
    const scenario = {
      id: "s",
      name: "S",
      card: "9",
      encounterSets: [],
      acts: ["8"],
      agendas: ["7"],
      setup: [],
      tokens: {},
      resolutions: { none: { title: "", text: "", effects: [] } },
      connections: [],
    };
    const files = {
      "/content/campaigns/c/campaign.json": {
        id: "c",
        name: "C",
        scenarios: ["s"],
        chaosBags: { standard: ["0"] },
        packs: ["x"],
        generated: true,
      },
      "/content/campaigns/c/scenarios/s.json": scenario,
    };
    expect(buildContent(files, {}, ["x"]).errors).toEqual([]);
    const loaded = buildContent(
      { ...files, "/content/packs/x/cards.generated.json": [card("1", { pack: "x" })] },
      {},
      [],
    );
    expect(loaded.errors.map((e) => e.message)).toEqual(
      expect.arrayContaining(["missing card 9", "missing card 8", "missing card 7"]),
    );
  });

  it("the pack of a card is known from its code alone", () => {
    const index: [string, string, string][] = [
      ["01000", "01182", "core"],
      ["02001", "02333", "dwl"],
      ["09001", "09770b", "tsk"],
    ];
    expect(packOfCode(index, "01006")).toBe("core");
    expect(packOfCode(index, "02001")).toBe("dwl");
    expect(packOfCode(index, "09770b")).toBe("tsk");
    expect(packOfCode(index, "05001")).toBeUndefined();
    expect(packOfCode(index, "00999")).toBeUndefined();
  });

  it("packsOf names the packs of some cards, once each, as the bundled index has them", () => {
    expect(packsOf(["02001", "02006", "01006", "02007"])).toEqual(["dwl", "core"]);
    expect(packsOf(["02001", "nonsense"])).toEqual(["dwl"]);
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
    expect(db.i18n.ru.cards["02001"].name).toBe("Зои Самарас");
  });
});
