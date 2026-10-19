import { beforeAll, describe, expect, it } from "vitest";
import type { ContentDb } from "../engine/types";
import { campaignCoverage, checkCampaignCards, scenarioCoverage, checkCoverage, contentCoverage, coverageJson, investigatorCoverage, packCoverage } from "./coverage";
import { loadContentFromDisk } from "./node";

const card = (code: string, over: object = {}) => ({ code, name: code, type: "treachery", faction: "mythos", pack: "p", text: "", abilities: [], ...over });

const TOK = { skull: { modifier: -1 } };

/** a tiny content: one pack with a working and a broken encounter card, a working and a broken player card */
const fixture = (scripted: boolean, broken = true): ContentDb =>
  ({
    cards: {
      e1: card("e1", { encounterSet: "set" }),
      e2: card("e2", { encounterSet: "set", type: "enemy", text: "When this enters play, do a thing." }),
      r1: card("r1", { type: "scenario", encounterSet: "set" }),
      a1: card("a1", { type: "agenda" }),
      c1: card("c1", { type: "act", text: broken ? "Objective - something." : "" }),
      p1: card("p1", { type: "asset", faction: "guardian" }),
      p2: card("p2", { type: "event", faction: "guardian", text: "Do a thing." }),
      i1: card("i1", { type: "investigator", faction: "seeker", text: "Odd." }),
      s1: card("s1", { type: "asset", faction: "seeker", text: "Odd." }),
    },
    packs: { p: { loaded: true, cards: ["e1", "e2", "r1", "a1", "c1", "p1", "p2", "i1", "s1"] } },
    encounterSets: { set: ["e1", "e2", "r1"] },
    scenarios: { s: { id: "s", card: "r1", encounterSets: ["set"], sideDecks: {}, acts: ["c1"], agendas: ["a1"], tokens: { easy: TOK, standard: TOK, hard: TOK, expert: TOK } } },
    campaigns: { camp: { id: "camp", scenarios: ["s"], generated: true } },
    investigators: { i1: { code: "i1", signatures: ["s1"] } },
    scripts: scripted ? { s: { fns: {} } } : {},
  }) as unknown as ContentDb;

describe("pack coverage", () => {
  it("counts encounter and player cards apart, and what doesn't work by type", () => {
    const p = packCoverage(fixture(false)).p;
    expect(p.encounter).toEqual({ total: 5, works: 3, rest: { enemy: 1, act: 1 } });
    expect(p.player).toEqual({ total: 3, works: 1, rest: { asset: 1, event: 1 } });
  });
});

describe("pack coverage by card pack", () => {
  it("a folder holding several packs reports each pack apart", () => {
    const db = fixture(false);
    db.cards.p2.pack = "q";
    const r = packCoverage(db);
    expect(Object.keys(r)).toEqual(["p", "q"]);
    expect(r.q.player).toEqual({ total: 1, works: 0, rest: { event: 1 } });
  });

  it("the Dunwich cycle's deluxe box and its mythos packs are packs of their own", async () => {
    const { db } = await loadContentFromDisk();
    expect(Object.keys(db.coverage!.packs)).toEqual(expect.arrayContaining(["dwl", "tmm", "tece", "bota", "uau", "wda", "litas"]));
  });
});

describe("campaign coverage", () => {
  it("counts the cards its scenarios use, not the player cards, and lists unscripted scenarios", () => {
    const c = campaignCoverage(fixture(false), "camp");
    expect(c.cards).toEqual({ total: 5, works: 3, rest: { enemy: 1, act: 1 } });
    expect(c.unscripted).toEqual(["s"]);
    expect(c.complete).toBe(false);
  });

  it("counts the scenario's reference card, which works once its tokens are written", () => {
    const db = fixture(false);
    expect(campaignCoverage(db, "camp").cards.total).toBe(5);
    db.cards.r1.text = "Easy / Standard\n[skull] -X. X is the number of Ghouls.";
    expect(campaignCoverage(db, "camp").cards.rest).toEqual({ act: 1, enemy: 1, scenario: 1 });
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

describe("scenario coverage", () => {
  it("counts the cards the scenario uses, its tokens, its script, and whether it is complete", () => {
    const db = fixture(false);
    expect(scenarioCoverage(db, "s")).toEqual({ campaign: "camp", cards: { total: 5, works: 3, rest: { act: 1, enemy: 1 } }, tokens: true, scripted: false, complete: false });
  });

  it("is complete when every card works and it is scripted", () => {
    const db = fixture(true);
    db.cards.e2.text = "";
    db.cards.c1.text = "";
    expect(scenarioCoverage(db, "s").complete).toBe(true);
  });

  it("has tokens false while the reference card prints a line the tokens don't cover", () => {
    const db = fixture(true);
    db.cards.e2.text = "";
    db.cards.c1.text = "";
    db.cards.r1.text = "[skull] -X. X is the number of Ghouls.";
    const c = scenarioCoverage(db, "s");
    expect(c.tokens).toBe(false);
    expect(c.complete).toBe(false);
  });

  it("a shared set counts in each scenario and once in the campaign", () => {
    const db = fixture(true);
    db.scenarios.t = { ...db.scenarios.s, id: "t", card: "r1" } as never;
    db.campaigns.camp.scenarios = ["s", "t"];
    expect(scenarioCoverage(db, "t").cards.total).toBe(5);
    expect(campaignCoverage(db, "camp").cards.total).toBe(5);
  });

  it("a scenario sharing its reference card with a Return-to scenario is judged by its own tokens", () => {
    const db = fixture(true);
    db.cards.e2.text = "";
    db.cards.c1.text = "";
    db.scenarios.rt = { id: "rt", card: "r1", encounterSets: [], sideDecks: {}, acts: [], agendas: [], tokens: { easy: {}, standard: {}, hard: {}, expert: {} } } as never;
    db.campaigns.ret = { id: "ret", scenarios: ["rt"], generated: true } as never;
    expect(scenarioCoverage(db, "s")).toMatchObject({ tokens: true, complete: true });
    expect(campaignCoverage(db, "camp").complete).toBe(true);
    expect(scenarioCoverage(db, "rt")).toMatchObject({ tokens: false, complete: false });
    expect(campaignCoverage(db, "ret").complete).toBe(false);
    expect(packCoverage(db).p.encounter.rest).toEqual({ scenario: 1 }); // the shared card is not real for rt
  });

  it("a campaign is complete when all its scenarios are", () => {
    const db = fixture(true);
    db.cards.e2.text = "";
    db.cards.c1.text = "";
    expect(campaignCoverage(db, "camp").complete).toBe(true);
    db.scenarios.t = { ...db.scenarios.s, id: "t" } as never;
    db.campaigns.camp.scenarios = ["s", "t"];
    expect(campaignCoverage(db, "camp").complete).toBe(false); // t has no script
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

  it("every scenario of a campaign has a report naming it, and The Gathering is not complete until its Hard and Expert tokens are written", () => {
    expect(Object.keys(db.coverage!.scenarios).length).toBe(Object.values(db.campaigns).flatMap((c) => c.scenarios).length);
    expect(db.coverage!.scenarios["the-gathering"].campaign).toBe("night-of-the-zealot");
    expect(db.coverage!.scenarios["extracurricular-activity"]).toMatchObject({ campaign: "the-dunwich-legacy", tokens: false, scripted: false, complete: false });
  });

  it("Night of the Zealot is complete: its scenarios scripted, every card working, its tokens real on all four difficulties", () => {
    expect(campaignCoverage(db, "night-of-the-zealot")).toMatchObject({ complete: true, unscripted: [] });
    for (const id of ["the-gathering", "the-midnight-masks", "the-devourer-below"]) expect(scenarioCoverage(db, id), id).toMatchObject({ tokens: true, scripted: true, complete: true });
  });

  it("Night of the Zealot has its three scenarios scripted and a few cards left", () => {
    const c = campaignCoverage(db, "night-of-the-zealot");
    expect(c.unscripted).toEqual([]);
    expect(c.cards.total).toBeGreaterThan(60);
    expect(c.cards.total - c.cards.works).toBe(Object.values(c.cards.rest).reduce((a, b) => a + b, 0));
    expect(c.complete).toBe(c.cards.works === c.cards.total);
  });

  it("Night of the Zealot carries the fields a generated campaign does, a chapter for each scenario", () => {
    const c = db.campaigns["night-of-the-zealot"];
    expect(c.packs).toEqual(["core"]);
    expect(c.card).toBe("01104");
    expect(c.cards.map((ch) => [ch.scenario, ch.code, ch.agenda, ch.act])).toEqual(
      c.scenarios.map((id) => [id, db.scenarios[id].card, db.scenarios[id].agendas[0], db.scenarios[id].acts[0]]),
    );
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
