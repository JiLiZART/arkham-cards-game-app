import { describe, expect, it } from "vitest";
import { db } from "../../engine/testkit";
import { saveCustomDeck } from "../decks";
import type { Storage } from "../store";
import { back, canContinue, cycleName, cyclesOf, decksFor, investigatorInfo, pickerList, campaignOrder, initialWizard, invalidDecksFor, next, setCampaign, setDeck, setDifficulty, STEPS, toggleInvestigator, toSetup, type WizardState } from "./wizard";

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
    const saved = saveCustomDeck(db, store, { name: "Roland · test", investigator: ROLAND, base: "roland-starter", ops: [{ op: "remove", code: "01087" }, { op: "add", code: "01087" }] });
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
    const saved = saveCustomDeck(db, store, { name: "Old", investigator: ROLAND, base: "roland-starter", ops: [] });
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
