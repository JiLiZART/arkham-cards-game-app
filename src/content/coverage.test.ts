import { beforeAll, describe, expect, it } from "vitest";
import type { ContentDb } from "../engine/types";
import { campaignCoverage, checkCampaignCards, checkCoverage, contentCoverage, coverageJson, investigatorCoverage, packCoverage } from "./coverage";
import { loadContentFromDisk } from "./node";

const card = (code: string, over: object = {}) => ({ code, name: code, type: "treachery", faction: "mythos", pack: "p", text: "", abilities: [], ...over });

/** a tiny content: one pack with a working and a broken encounter card, a working and a broken player card */
const fixture = (scripted: boolean, broken = true): ContentDb =>
  ({
    cards: {
      e1: card("e1", { encounterSet: "set" }),
      e2: card("e2", { encounterSet: "set", type: "enemy", text: "When this enters play, do a thing." }),
      a1: card("a1", { type: "agenda" }),
      c1: card("c1", { type: "act", text: broken ? "Objective - something." : "" }),
      p1: card("p1", { type: "asset", faction: "guardian" }),
      p2: card("p2", { type: "event", faction: "guardian", text: "Do a thing." }),
      i1: card("i1", { type: "investigator", faction: "seeker", text: "Odd." }),
      s1: card("s1", { type: "asset", faction: "seeker", text: "Odd." }),
    },
    packs: { p: { loaded: true, cards: ["e1", "e2", "a1", "c1", "p1", "p2", "i1", "s1"] } },
    encounterSets: { set: ["e1", "e2"] },
    scenarios: { s: { id: "s", encounterSets: ["set"], sideDecks: {}, acts: ["c1"], agendas: ["a1"] } },
    campaigns: { camp: { id: "camp", scenarios: ["s"], generated: true } },
    investigators: { i1: { code: "i1", signatures: ["s1"] } },
    scripts: scripted ? { s: { fns: {} } } : {},
  }) as unknown as ContentDb;

describe("pack coverage", () => {
  it("counts encounter and player cards apart, and what doesn't work by type", () => {
    const p = packCoverage(fixture(false)).p;
    expect(p.encounter).toEqual({ total: 4, works: 2, rest: { enemy: 1, act: 1 } });
    expect(p.player).toEqual({ total: 3, works: 1, rest: { asset: 1, event: 1 } });
  });
});

describe("campaign coverage", () => {
  it("counts the cards its scenarios use, not the player cards, and lists unscripted scenarios", () => {
    const c = campaignCoverage(fixture(false), "camp");
    expect(c.cards).toEqual({ total: 4, works: 2, rest: { enemy: 1, act: 1 } });
    expect(c.unscripted).toEqual(["s"]);
    expect(c.complete).toBe(false);
  });

  it("leaves out scenario reference cards, whose tokens are data", () => {
    const db = fixture(false);
    db.cards.r1 = card("r1", { type: "scenario", encounterSet: "set", text: "Setup stuff." }) as never;
    db.encounterSets.set.push("r1");
    expect(campaignCoverage(db, "camp").cards.total).toBe(4);
  });

  it("is complete although generated when every card works and every scenario has a script", () => {
    const db = fixture(true);
    db.cards.e2.text = "";
    db.cards.c1.text = "";
    const c = campaignCoverage(db, "camp");
    expect(c.cards.rest).toEqual({});
    expect(c.complete).toBe(true);
  });

  it("is not complete with all cards working but a scenario without a script", () => {
    const db = fixture(false);
    db.cards.e2.text = "";
    db.cards.c1.text = "";
    expect(campaignCoverage(db, "camp").complete).toBe(false);
  });
});

describe("investigator coverage", () => {
  it("works when the investigator's card and signature cards work", () => {
    const db = fixture(false);
    expect(investigatorCoverage(db).i1).toBe(false);
    db.cards.i1.text = "";
    expect(investigatorCoverage(db).i1).toBe(false);
    db.cards.s1.text = "";
    expect(investigatorCoverage(db).i1).toBe(true);
  });
});

describe("the real content", () => {
  let db: ContentDb;
  beforeAll(async () => {
    db = (await loadContentFromDisk()).db;
  });

  it("Night of the Zealot has its three scenarios scripted and a few cards left", () => {
    const c = campaignCoverage(db, "night-of-the-zealot");
    expect(c.unscripted).toEqual([]);
    expect(c.cards.total).toBeGreaterThan(60);
    expect(c.cards.total - c.cards.works).toBe(Object.values(c.cards.rest).reduce((a, b) => a + b, 0));
    expect(c.complete).toBe(c.cards.works === c.cards.total);
  });

  it("The Dunwich Legacy is partial with no scenario scripted", () => {
    const c = campaignCoverage(db, "the-dunwich-legacy");
    expect(c.complete).toBe(false);
    expect(c.unscripted).toHaveLength(8);
    expect(c.cards.works).toBeLessThan(c.cards.total);
  });
});

describe("content/coverage.json", () => {
  it("is what the content gives, and a rerun is identical", async () => {
    const { db } = await loadContentFromDisk();
    expect(coverageJson(db)).toBe(coverageJson(db));
    expect(db.coverage).toBeDefined();
    expect(coverageJson(db)).toBe(JSON.stringify(db.coverage, null, 1) + "\n");
  });
});

describe("checkCoverage", () => {
  it("passes when the committed report is the computed one", () => {
    const db = fixture(false);
    db.coverage = contentCoverage(db);
    expect(checkCoverage(db)).toEqual([]);
  });

  it("fails naming the command when the content moved on", () => {
    const db = fixture(false);
    db.coverage = contentCoverage(db);
    db.cards.e2.text = "";
    expect(checkCoverage(db).map((e) => e.message)).toEqual(["content/coverage.json is behind the content (npm run coverage)"]);
  });

  it("fails when there is no file", () => {
    expect(checkCoverage(fixture(false))).toHaveLength(1);
  });
});

describe("checkCampaignCards", () => {
  const withCards = (cards: object[]) => {
    const db = fixture(false);
    db.cards.a1.code = "a1";
    (db.scenarios.s as { card: string }).card = "c0";
    db.campaigns.camp.cards = cards as never;
    return db;
  };
  it("passes chapters that match their scenarios' reference card, first agenda and first act", () => {
    expect(checkCampaignCards(withCards([{ scenario: "s", code: "c0", agenda: "a1", act: "c1" }, { scenario: "mid", interlude: true }]))).toEqual([]);
  });
  it("names a chapter that drifted", () => {
    const e = checkCampaignCards(withCards([{ scenario: "s", code: "c0", agenda: "zz", act: "c1" }]));
    expect(e.map((x) => x.path)).toEqual(["cards.0.agenda"]);
  });
});
