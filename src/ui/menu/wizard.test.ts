import { describe, expect, it } from "vitest";
import { loadPacksFor } from "../../content";
import { campaignName } from "../../content/i18n";
import { db } from "../../engine/testkit";
import { saveCustomDeck } from "../decks";
import type { Storage } from "../store";
import { back, canContinue, cardsOfPicks, sortPicker, SORTS, deckProblems, cycleName, picksReady, cyclesOf, decksFor, investigatorInfo, pickerList, campaignOrder, filterCampaigns, tileName, initialWizard, NO_CAMPAIGN_FILTER, type CampaignFilter, invalidDecksFor, next, setCampaign, setDeck, setDifficulty, STEPS, toggleInvestigator, toSetup, type WizardState } from "./wizard";

const ROLAND = "01001";
const DAISY = "01002";
const SKIDS = "01003";
const AGNES = "01004";
const WENDY = "01005";

const tap = (s: WizardState, ...codes: string[]) => codes.reduce((w, c) => toggleInvestigator(db, w, c), s);

describe("wizard picks", () => {
  it("starts on the campaign step with the first campaign and the standard bag", () => {
    const s = initialWizard(db);
    expect(s).toMatchObject({ step: "campaign", campaignId: "night-of-the-zealot", difficulty: "standard", picks: [] });
  });

  it("the order tapped is the turn order: Daisy then Roland is P1, P2", () => {
    expect(tap(initialWizard(db), DAISY, ROLAND).picks).toEqual([DAISY, ROLAND]);
  });

  it("a fifth tap is ignored", () => {
    const s = tap(initialWizard(db), ROLAND, DAISY, SKIDS, AGNES, WENDY);
    expect(s.picks).toEqual([ROLAND, DAISY, SKIDS, AGNES]);
  });

  it("tapping a chosen investigator again removes them and the rest close up", () => {
    const s = tap(initialWizard(db), ROLAND, DAISY, SKIDS, DAISY);
    expect(s.picks).toEqual([ROLAND, SKIDS]);
    expect(s.decks[DAISY]).toBeUndefined();
  });

  it("a picked investigator gets their first starter deck; another can be chosen", () => {
    let s = tap(initialWizard(db), ROLAND);
    expect(s.decks[ROLAND]).toBe("roland-starter");
    s = setDeck(s, ROLAND, "some-other-deck");
    expect(s.decks[ROLAND]).toBe("some-other-deck");
  });
});

describe("wizard steps", () => {
  it("Continue needs an investigator before the decks step, and every step walks forward and back", () => {
    let s = initialWizard(db);
    expect(canContinue(db, s)).toBe(true); // campaign
    s = next(db, s);
    expect(s.step).toBe("investigators");
    expect(canContinue(db, s)).toBe(false);
    expect(next(db, s).step).toBe("investigators");
    s = next(db, tap(s, ROLAND));
    expect(s.step).toBe("decks");
    s = next(db, s);
    expect(s.step).toBe("difficulty");
    s = next(db, s);
    expect(s.step).toBe("ready");
    expect(next(db, s).step).toBe("ready");
    expect(STEPS.map((x) => x)).toEqual(["campaign", "investigators", "decks", "difficulty", "ready"]);
  });

  it("going back keeps the picks, the deck and the difficulty", () => {
    let s = tap(initialWizard(db), DAISY, ROLAND);
    s = { ...s, step: "decks" };
    s = setDifficulty(s, "expert");
    const b = back(s);
    expect(b.step).toBe("investigators");
    expect(b.picks).toEqual([DAISY, ROLAND]);
    expect(b.difficulty).toBe("expert");
    expect(back({ ...s, step: "campaign" }).step).toBe("campaign");
  });

  it("the decks step blocks Continue while a chosen deck is invalid or missing", () => {
    const s = { ...tap(initialWizard(db), ROLAND), step: "decks" as const };
    expect(canContinue(db, s)).toBe(true);
    expect(canContinue(db, setDeck(s, ROLAND, "no-such-deck"))).toBe(false);
  });

  it("a difficulty the campaign doesn't define can't be chosen", () => {
    expect(setDifficulty(initialWizard(db), "nightmare" as never, db).difficulty).toBe("standard");
  });

  it("changing the campaign resets nothing else it doesn't have to", () => {
    const s = setCampaign(tap(initialWizard(db), ROLAND), "night-of-the-zealot");
    expect(s.picks).toEqual([ROLAND]);
    expect(setCampaign(s, "made-up", db).campaignId).toBe("night-of-the-zealot");
  });
});

describe("toSetup", () => {
  it("is what newCampaign takes: campaign, difficulty, a seed and the investigators with their decks in order", () => {
    let s = tap(initialWizard(db), DAISY, ROLAND);
    s = setDifficulty(s, "expert");
    expect(toSetup(s, 42)).toEqual({
      campaignId: "night-of-the-zealot",
      difficulty: "expert",
      seed: 42,
      investigators: [{ code: DAISY, deckId: "daisy-starter" }, { code: ROLAND, deckId: "roland-starter" }],
    });
  });
});

describe("custom decks in the wizard", () => {
  const memory = (): Storage & { data: Map<string, string> } => {
    const data = new Map<string, string>();
    return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
  };

  it("a saved deck is offered after the starter deck, and a pick of it goes to the campaign as the deck itself", () => {
    const store = memory();
    const saved = saveCustomDeck(db, store, { name: "Roland · test", investigator: ROLAND, base: "roland-starter", cards: { ...db.decks["roland-starter"].cards }, randomBasicWeakness: false });
    expect(decksFor(db, ROLAND, store).map((d) => d.id)).toEqual(["roland-starter", saved.id]);
    let s = tap(initialWizard(db), ROLAND);
    s = setDeck(s, ROLAND, saved.id);
    const setup = toSetup(s, 7, db, store);
    expect(setup.investigators).toEqual([{ code: ROLAND, deckId: saved.id, deck: expect.objectContaining({ id: saved.id, investigator: ROLAND }) }]);
  });

  it("a starter deck goes by its id alone", () => {
    expect(toSetup(tap(initialWizard(db), ROLAND), 1, db, memory()).investigators).toEqual([{ code: ROLAND, deckId: "roland-starter" }]);
  });

  it("a saved deck that no longer validates is listed apart with its reasons and can't be picked", () => {
    const store = memory();
    const saved = saveCustomDeck(db, store, { name: "Old", investigator: ROLAND, base: "roland-starter", cards: { ...db.decks["roland-starter"].cards }, randomBasicWeakness: false });
    const raw = JSON.parse(store.getItem("ah:decks")!);
    raw[0].deck.cards["99999"] = 1;
    store.setItem("ah:decks", JSON.stringify(raw));
    expect(decksFor(db, ROLAND, store).map((d) => d.id)).toEqual(["roland-starter"]);
    expect(invalidDecksFor(db, ROLAND, store).map((d) => [d.id, d.problems.length > 0])).toEqual([[saved.id, true]]);
  });
});

describe("the campaign list", () => {
  it("Night of the Zealot first, then the generated campaigns in cycle order, the side scenarios last", () => {
    const ids = campaignOrder(db).map((c) => c.id);
    expect(ids[0]).toBe("night-of-the-zealot");
    expect(ids.indexOf("the-dunwich-legacy")).toBeLessThan(ids.indexOf("the-path-to-carcosa"));
    expect(ids.indexOf("the-path-to-carcosa")).toBeLessThan(ids.indexOf("the-scarlet-keys"));
    // the Return-to boxes after every cycle, in the same cycle order
    expect(ids.indexOf("the-drowned-city")).toBeLessThan(ids.indexOf("return-to-the-night-of-the-zealot"));
    expect(ids.indexOf("return-to-the-night-of-the-zealot")).toBeLessThan(ids.indexOf("return-to-the-dunwich-legacy"));
    const firstSide = ids.findIndex((id) => id.startsWith("side-"));
    expect(ids.slice(firstSide).every((id) => id.startsWith("side-"))).toBe(true);
    expect(initialWizard(db).campaignId).toBe("night-of-the-zealot");
  });
});


describe("filtering the campaign list", () => {
  const ids = (f: Partial<CampaignFilter> = {}, locale = "en") => filterCampaigns(db, locale, { ...NO_CAMPAIGN_FILTER, ...f }).map((c) => c.id);

  it("with no filter is the whole list in order", () => {
    expect(ids()).toEqual(campaignOrder(db).map((c) => c.id));
  });

  it("by kind: campaigns, Return-to boxes, side scenarios", () => {
    expect(ids({ kind: "campaign" })).toEqual(expect.arrayContaining(["night-of-the-zealot", "the-dunwich-legacy"]));
    expect(ids({ kind: "campaign" }).some((id) => id.startsWith("return-to-") || id.startsWith("side-"))).toBe(false);
    expect(ids({ kind: "return" }).every((id) => id.startsWith("return-to-"))).toBe(true);
    expect(ids({ kind: "return" })).toContain("return-to-the-dunwich-legacy");
    expect(ids({ kind: "side" }).every((id) => id.startsWith("side-"))).toBe(true);
    expect(ids({ kind: "side" })).toContain("side-carnevale-of-horrors");
  });

  it("by rules: only the hand-written campaign is complete, the generated ones are partial", () => {
    expect(ids({ rules: "complete" })).toEqual(["night-of-the-zealot"]);
    expect(ids({ rules: "partial" })).not.toContain("night-of-the-zealot");
    expect(ids({ rules: "partial" }).length + 1).toBe(ids().length);
  });

  it("by length: one scenario, two to four, five or more", () => {
    const n = (id: string) => db.campaigns[id].scenarios.length;
    expect(ids({ length: "one" }).every((id) => n(id) === 1)).toBe(true);
    expect(ids({ length: "few" }).every((id) => n(id) >= 2 && n(id) <= 4)).toBe(true);
    expect(ids({ length: "many" }).every((id) => n(id) >= 5)).toBe(true);
    expect(ids({ length: "one" }).length + ids({ length: "few" }).length + ids({ length: "many" }).length).toBe(ids().length);
    expect(ids({ length: "few" })).toContain("night-of-the-zealot");
  });

  it("by name, in the game's language, or by the name of a scenario in it", () => {
    expect(ids({ query: "dunwich" })).toEqual(expect.arrayContaining(["the-dunwich-legacy", "return-to-the-dunwich-legacy"]));
    expect(ids({ query: "extracurricular" })).toContain("the-dunwich-legacy");
    expect(ids({ query: "данвич" }, "ru")).toContain("the-dunwich-legacy");
    expect(ids({ query: "  CARNEVALE " })).toEqual(["side-carnevale-of-horrors"]);
    expect(ids({ query: "zzzz" })).toEqual([]);
  });

  it("names a side scenario by its own name, in the game's language, and a campaign by its name", () => {
    const side = db.campaigns["side-carnevale-of-horrors"];
    expect(tileName(db, side, "en")).toBe("Carnevale of Horrors");
    expect(tileName(db, side, "ru")).not.toBe(campaignName(db, side.id, "ru"));
    expect(tileName(db, side, "ru")).toMatch(/Карнавал/);
    expect(tileName(db, db.campaigns["the-dunwich-legacy"], "ru")).toBe("Наследие Данвича");
  });

  it("combines the filters", () => {
    expect(ids({ kind: "side", query: "carn" })).toEqual(["side-carnevale-of-horrors"]);
    expect(ids({ kind: "campaign", rules: "complete" })).toEqual(["night-of-the-zealot"]);
    expect(ids({ kind: "side", rules: "complete" })).toEqual([]);
  });
});

describe("choosing among all investigators", () => {
  const codes = (list: { code: string }[]) => list.map((i) => i.code);
  const all = { faction: null, cycle: null, query: "" };

  it("lists every defined investigator, the packs' cards loaded or not", () => {
    expect(codes(pickerList(db, "en", all))).toEqual(expect.arrayContaining(["01001", "02001", "02002"]));
    expect(pickerList(db, "en", all).length).toBe(Object.keys(db.investigators).length);
  });

  it("filters by class and by cycle: Seekers of The Dunwich Legacy are Rex Murphy and not Roland Banks", () => {
    const list = codes(pickerList(db, "en", { ...all, faction: "seeker", cycle: "dwl" }));
    expect(list).toContain("02002");
    expect(list).not.toContain("01001");
    expect(list.every((c) => db.investigators[c].faction === "seeker" && db.investigators[c].pack === "dwl")).toBe(true);
  });

  it("searches the name in the game's language: Зои finds Zoey Samaras in Russian although her pack is not loaded", () => {
    expect(codes(pickerList(db, "ru", { ...all, query: "зои" }))).toContain("02001");
    expect(codes(pickerList(db, "en", { ...all, query: "zoey" }))).toEqual(["02001"]);
    // the English name still finds them in Russian
    expect(codes(pickerList(db, "ru", { ...all, query: "zoey" }))).toContain("02001");
    expect(codes(pickerList(db, "en", { ...all, query: "Samaras the chef" }))).toEqual(["02001"]);
  });

  it("shows a name and class before the pack is loaded", () => {
    expect(investigatorInfo(db, "02001", "en")).toMatchObject({ name: "Zoey Samaras", faction: "guardian", pack: "dwl" });
    expect(investigatorInfo(db, "02001", "ru").name).toBe("Зои Самарас");
    expect(investigatorInfo(db, "01001", "ru").name).toBe("Роланд Бэнкс");
  });

  it("notes the investigators whose ability has no written behaviour, and those with no deck", () => {
    const byCode = Object.fromEntries(pickerList(db, "en", all).map((i) => [i.code, i]));
    expect(byCode["01001"]).toMatchObject({ partlyImplemented: false, needsDeck: false });
    expect(byCode["02001"]).toMatchObject({ partlyImplemented: true, needsDeck: false });
    const without = Object.values(byCode).find((i) => i.needsDeck);
    expect(without).toBeDefined();
  });

  it("an investigator without a deck cannot be picked", () => {
    const code = pickerList(db, "en", all).find((i) => i.needsDeck)!.code;
    expect(toggleInvestigator(db, initialWizard(db), code).picks).toEqual([]);
  });

  it("Zoey is picked with her starter deck", () => {
    expect(toggleInvestigator(db, initialWizard(db), "02001")).toMatchObject({ picks: ["02001"], decks: { "02001": "02001-starter" } });
  });

  it("the cycles to filter by are those of the investigators, named after their campaign", () => {
    const cycles = cyclesOf(db);
    expect(cycles).toContain("core");
    expect(cycles).toContain("dwl");
    expect(cycleName(db, "en", "dwl")).toBe("The Dunwich Legacy");
    expect(cycleName(db, "en", "core")).toBe("Night of the Zealot");
    expect(cycleName(db, "en", "investigator")).toBe("Investigator Expansions");
  });
});

describe("the decks of investigators from other cycles", () => {
  it("wait for their packs: not refused as unknown cards, and Continue waits until they are loaded", async () => {
    let s = tap(initialWizard(db), "02001");
    s = { ...s, step: "decks" };
    expect(cardsOfPicks(db, s)).toEqual(expect.arrayContaining(["02001", "02006", "02007"]));
    expect(picksReady(db, s)).toBe(false);
    expect(deckProblems(db, s, "02001")).toEqual([]);
    expect(canContinue(db, s)).toBe(false);
    await loadPacksFor(cardsOfPicks(db, s));
    expect(picksReady(db, s)).toBe(true);
    expect(deckProblems(db, s, "02001")).toEqual([]);
    expect(canContinue(db, s)).toBe(true);
  });
});

describe("sorting the investigators", () => {
  const all = { faction: null, cycle: null, query: "" };
  const list = () => pickerList(db, "en", all).filter((i) => i.pack === "core" || !i.pack);
  it("by release (the default), by name, by class", () => {
    expect(SORTS[0]).toBe("release");
    expect(sortPicker(db, list(), "release").map((i) => i.code).slice(0, 2)).toEqual(["01001", "01002"]);
    const names = sortPicker(db, list(), "name").map((i) => i.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    const classes = sortPicker(db, list(), "class").map((i) => i.faction);
    expect(classes.indexOf("guardian")).toBeLessThan(classes.indexOf("survivor"));
  });
  it("by a stat, highest first: Roland's 9 health before Daisy's 5", () => {
    const byHealth = sortPicker(db, list(), "health").map((i) => i.code);
    expect(byHealth.indexOf("01001")).toBeLessThan(byHealth.indexOf("01002"));
    const byIntellect = sortPicker(db, list(), "intellect").map((i) => i.code);
    expect(byIntellect[0]).toBe("01002");
  });
  it("an investigator whose card is not loaded goes last when sorting by a stat", () => {
    const zoey = pickerList(db, "en", { ...all, query: "zoey" });
    const mixed = [...zoey, ...list()];
    const s = sortPicker({ ...db, cards: { ...db.cards, "02001": undefined as never } }, mixed, "combat");
    expect(s.at(-1)!.code).toBe("02001");
  });
});
