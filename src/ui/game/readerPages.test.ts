import { beforeAll, describe, expect, it } from "vitest";
import { loadCampaign } from "../../content";
import { startCampaign } from "../../engine/campaign/campaign";
import { advance } from "../../engine/campaign/flow";
import type { CampaignState } from "../../engine/campaign/types";
import { db } from "../../engine/kits/testkit";
import {
  handsOver,
  inReaderTerritory,
  mergePages,
  pagesNow,
  paragraphsOf,
  roman,
} from "./readerPages";

beforeAll(async () => {
  await loadCampaign("the-forgotten-age");
});

const begin = (campaignId: string, code = "01001", deckId = "roland-starter") =>
  startCampaign(db, {
    campaignId,
    difficulty: "standard",
    seed: 3,
    investigators: [{ code, deckId }],
  });

describe("pages from the campaign's state (2.1)", () => {
  it("a new Night of the Zealot campaign: the opening, then The Gathering's page", () => {
    const pages = pagesNow(db, begin("night-of-the-zealot"), "en", true);
    expect(pages.map((p) => p.kind)).toEqual(["opening", "scenario"]);
    expect(pages[0].title).toBe("Night of the Zealot");
    expect(pages[0].paragraphs.join(" ")).toMatch(/^Friday, September 18, 1925/);
    expect(pages[1]).toMatchObject({
      id: "scenario:the-gathering",
      label: "Scenario I",
      title: "The Gathering",
      scenario: "the-gathering",
    });
    expect(pages[1].paragraphs.join(" ")).toMatch(/^You and your partners have been investigating/);
  });

  it("the opening is for the first look only, and for a campaign with no scenario played", () => {
    const c = begin("night-of-the-zealot");
    expect(pagesNow(db, c, "en", false).map((p) => p.kind)).toEqual(["scenario"]);
    const later: CampaignState = {
      ...c,
      history: [{ scenarioId: "the-gathering", resolution: "R1", xp: 0, victory: 0 }],
    };
    expect(pagesNow(db, later, "en", true).map((p) => p.kind)).toEqual(["scenario"]);
  });

  it("a scenario after the door has its own pages only, numbered by its place in the order", () => {
    const c = begin("night-of-the-zealot");
    const masks: CampaignState = {
      ...c,
      history: [{ scenarioId: "the-gathering", resolution: "R1", xp: 0, victory: 0 }],
      flow: {
        ...c.flow,
        waiting: { id: "play", step: { kind: "play", scenario: "the-midnight-masks" } },
      },
    };
    const pages = pagesNow(db, masks, "en", true);
    expect(pages).toHaveLength(1);
    expect(pages[0]).toMatchObject({ label: "Scenario II", title: "The Midnight Masks" });
  });

  it("The Forgotten Age: the prologue story, the supply point, then The Untamed Wilds", () => {
    let c = begin("the-forgotten-age");
    // the prologue story is the opening: the blurb is not read as well
    const first = pagesNow(db, c, "en", true);
    expect(first.map((p) => p.id)).toEqual(["story:campaign:prologue"]);
    expect(first[0].title).toBe("Earth is Not Ours");
    c = advance(db, c, "continue");
    const supplies = pagesNow(db, c, "en", false);
    expect(supplies.at(-1)).toMatchObject({ kind: "prompt", prompt: "buySupplies" });
  });

  it("is in Russian in Russian", () => {
    const pages = pagesNow(db, begin("night-of-the-zealot"), "ru", true);
    expect(pages.at(-1)?.label).toBe("Сценарий I");
    expect(pages.at(-1)?.title).toBe("Встреча");
  });

  it("log entries recorded since the last answer are notes on the page they follow", () => {
    const c = begin("the-forgotten-age");
    const withNote: CampaignState = {
      ...c,
      flow: {
        ...c.flow,
        shown: [...c.flow.shown, { recorded: { id: "zzNote", section: "campaign_notes" } }],
      },
    };
    const pages = pagesNow(db, withNote, "en", false);
    expect(pages[0].notes).toEqual(["ZzNote"]);
  });

  it("a deck upgrade or side scenario on offer is handed over, not drawn", () => {
    const c = begin("night-of-the-zealot");
    const up: CampaignState = {
      ...c,
      flow: { ...c.flow, waiting: { id: "up", step: { kind: "upgradeDecks" } } },
    };
    expect(handsOver(up)).toBe(true);
    expect(handsOver(c)).toBe(false);
    expect(pagesNow(db, up, "en", false)).toEqual([]);
  });
});

describe("paragraphs (2.2)", () => {
  const long = (w: string) => `${w} `.repeat(50).trim();

  it("splits at blank lines", () => {
    expect(paragraphsOf("One.\n\nTwo.\n\n\nThree.")).toEqual(["One.", "Two.", "Three."]);
  });

  it("splits at a single line break between two long lines, not between short ones", () => {
    expect(paragraphsOf(`${long("a")}\n${long("b")}`)).toEqual([long("a"), long("b")]);
    expect(paragraphsOf("Dear Sir,\nI write to you\nYours")).toEqual([
      "Dear Sir,\nI write to you\nYours",
    ]);
  });

  it("keeps a <center> or <blockquote> block whole, however many lines it holds", () => {
    const text = `Before.\n\n<center><fancy>June 1926</fancy>\n\n${long("x")}\n${long("y")}</center>\n\nAfter.`;
    expect(paragraphsOf(text)).toEqual([
      "Before.",
      `<center><fancy>June 1926</fancy>\n\n${long("x")}\n${long("y")}</center>`,
      "After.",
    ]);
  });

  it("an empty text has no paragraphs", () => {
    expect(paragraphsOf("")).toEqual([]);
  });
});

describe("kept pages (2.3)", () => {
  it("an answer never removes a page already turned; new pages follow, repeats are dropped", () => {
    const a = { id: "story:a", kind: "story" as const, paragraphs: ["A"], notes: [] };
    const b = { id: "prompt:b", kind: "prompt" as const, paragraphs: ["B"], notes: [] };
    const c = { id: "scenario:c", kind: "scenario" as const, paragraphs: ["C"], notes: [] };
    const kept = mergePages([], [a, b]);
    expect(kept.map((p) => p.id)).toEqual(["story:a", "prompt:b"]);
    // the flow answered b and moved on: its state no longer holds a or b
    expect(mergePages(kept, [c]).map((p) => p.id)).toEqual(["story:a", "prompt:b", "scenario:c"]);
    expect(mergePages(kept, [a, b, c]).map((p) => p.id)).toEqual([
      "story:a",
      "prompt:b",
      "scenario:c",
    ]);
  });

  it("numbers", () => {
    expect([1, 2, 3, 4, 5, 9, 10, 11].map(roman)).toEqual([
      "I",
      "II",
      "III",
      "IV",
      "V",
      "IX",
      "X",
      "XI",
    ]);
  });
});

describe("the reader's own state (2.3)", () => {
  it("pages turned survive an answer that empties flow.shown", async () => {
    const { openReader, syncReader } = await import("./readerState");
    let c = begin("the-forgotten-age");
    let r = openReader(db, c, "en");
    expect(r.pages.map((p) => p.id)).toEqual(["story:campaign:prologue"]);
    expect(r).toMatchObject({ at: 0, revealed: 1 });
    c = advance(db, c, "continue");
    // the flow moved on: the prologue story is no longer among what it shows, the reader keeps it
    expect(pagesNow(db, c, "en", false).map((p) => p.id)).not.toContain("story:campaign:prologue");
    r = syncReader(r, db, c, "en");
    expect(r.pages.map((p) => p.id)).toEqual([
      "story:campaign:prologue",
      "story:tfa-prologue:intro",
      "story:tfa-prologue:expedition_leader:text",
      expect.stringMatching(/^prompt:tfa-prologue:supplies:01001$/),
    ]);
    // the same state again changes nothing
    expect(syncReader(r, db, c, "en")).toBe(r);
  });

  it("a prompt answered on another screen is marked answered, with the answer as words", async () => {
    const { openReader, syncReader, answerOf } = await import("./readerState");
    const c0 = begin("night-of-the-zealot");
    // a flow with a choice before the scenario, answered "elsewhere" while this reader sits on its first page
    const flow = {
      ...db.flows["night-of-the-zealot"],
      before: { "the-gathering": ["zzAsk"] },
      steps: {
        zzAsk: {
          kind: "chooseOne" as const,
          title: "A choice",
          text: "Wary or trusting?",
          choices: [
            { id: "wary", text: "We should be wary.", effects: [], steps: [] },
            { id: "trust", text: "Maybe I should listen.", effects: [], steps: [] },
          ],
        },
      },
    };
    const saved = db.flows["night-of-the-zealot"];
    db.flows["night-of-the-zealot"] = flow;
    try {
      let c = begin("night-of-the-zealot");
      let r = openReader(db, c, "en");
      expect(r.pages.map((p) => p.kind)).toEqual(["opening", "prompt"]);
      expect(answerOf(db, c, "en", r.pages[1])).toBeNull();
      c = advance(db, c, "wary");
      r = syncReader(r, db, c, "en");
      expect(r.pages.map((p) => p.kind)).toEqual(["opening", "prompt", "scenario"]);
      expect(answerOf(db, c, "en", r.pages[1])).toBe("We should be wary.");
      expect(r.at).toBe(0);
    } finally {
      db.flows["night-of-the-zealot"] = saved;
    }
    expect(c0.flow.waiting?.step.kind).toBe("play");
  });
});

describe("where the reader stands (3.1)", () => {
  const later = (c: CampaignState): CampaignState => ({
    ...c,
    history: [{ scenarioId: "the-gathering", resolution: "R1", xp: 0, victory: 0 }],
  });

  it("a new campaign is the reader's, including its prologue interlude", () => {
    expect(inReaderTerritory(begin("night-of-the-zealot"))).toBe(true);
    const tfa = advance(db, begin("the-forgotten-age"), "continue");
    expect(tfa.flow.item).toBe("tfa-prologue");
    expect(inReaderTerritory(tfa)).toBe(true);
  });

  it("after a scenario it is the reader's only once the resolution and interludes are read", () => {
    const c = begin("night-of-the-zealot");
    expect(inReaderTerritory(later(c))).toBe(true);
    const reading = later({
      ...c,
      flow: { ...c.flow, scenario: { id: "the-gathering" } as never },
    });
    expect(inReaderTerritory(reading)).toBe(false);
    expect(inReaderTerritory(later({ ...c, flow: { ...c.flow, item: "interlude" } }))).toBe(false);
  });

  it("a scenario in progress, or a finished campaign, is not", () => {
    const c = later(begin("night-of-the-zealot"));
    expect(inReaderTerritory({ ...c, flow: { ...c.flow, playing: true, waiting: null } })).toBe(
      false,
    );
    expect(inReaderTerritory({ ...c, result: "win" })).toBe(false);
  });
});
