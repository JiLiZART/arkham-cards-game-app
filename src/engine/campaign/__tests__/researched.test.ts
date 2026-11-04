import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../../content";
import { db } from "../../kits/testkit";
import { startCampaign } from "../campaign";
import { validateDeck } from "../decks";
import { record } from "../log";
import { upgradeDeck } from "../upgrade";

const DAISY = "01002";
const SOLUTION = "02021"; // Strange Solution (level 0): records the entry
const ICHOR = "02263"; // Strange Solution: Acidic Ichor (level 4), Researched
const ENTRY = "identifiedTheSolution";
const SWAP = "01033"; // a card of Daisy's starter deck the tests take out
let saved: (typeof db.cards)[string]["keywords"];

beforeAll(async () => {
  await loadPack("dwl");
  saved = db.cards[ICHOR].keywords;
});
afterEach(() => {
  db.cards[ICHOR].keywords = saved;
});

const starter = () => ({ ...db.decks["daisy-starter"].cards });
const deck = (cards: Record<string, number>) => ({
  id: "t",
  name: "t",
  investigator: DAISY,
  cards,
  randomBasicWeakness: true,
});
const swapIn = (cards: Record<string, number>, code: string, out = SWAP) => {
  const next = { ...cards, [code]: (cards[code] ?? 0) + 1 };
  if (next[out] > 1) next[out]--;
  else delete next[out];
  return next;
};
const researched = () => (db.cards[ICHOR].keywords = [{ researched: { log: ENTRY } }]);

describe("Researched", () => {
  it("is refused without the log entry, and in a standalone game (no log at all)", () => {
    researched();
    const cards = swapIn(starter(), ICHOR);
    expect(validateDeck(db, deck(cards), {}).map((p) => p.reason?.key)).toContain(
      "deck.researched",
    );
    expect(validateDeck(db, deck(cards)).map((p) => p.reason?.key)).toContain("deck.researched");
  });

  it("with the entry, it is refused beside its lower level, and accepted in its place", () => {
    researched();
    const log = { [ENTRY]: true };
    const both = swapIn(swapIn(starter(), SOLUTION), ICHOR, "01034");
    expect(validateDeck(db, deck(both), log).map((p) => p.reason?.key)).toContain(
      "deck.researched",
    );
    expect(
      validateDeck(db, deck(swapIn(starter(), ICHOR)), log).map((p) => p.reason?.key),
    ).not.toContain("deck.researched");
  });

  it("an upgrade takes it only in place of its lower-level version", () => {
    researched();
    const c0 = startCampaign(db, {
      campaignId: "night-of-the-zealot",
      difficulty: "standard",
      seed: 1,
      investigators: [{ code: DAISY, deckId: "daisy-starter" }],
    });
    // the campaign's own deck (its basic weakness drawn), with Strange Solution in it
    const own: Record<string, number> = {};
    for (const code of c0.investigators[0].deck) own[code] = (own[code] ?? 0) + 1;
    const withSolution = swapIn(own, SOLUTION);
    const c = {
      ...c0,
      log: record(c0.log, ENTRY),
      investigators: c0.investigators.map((i) => ({
        ...i,
        xp: 10,
        deck: Object.entries(withSolution).flatMap(([code, n]) => Array<string>(n).fill(code)),
      })),
    };
    const replaced: Record<string, number> = { ...withSolution, [ICHOR]: 1 };
    delete replaced[SOLUTION];
    const ok = upgradeDeck(db, c, DAISY, replaced);
    expect(ok.ok).toBe(true);
    const added = swapIn(withSolution, ICHOR, "01034");
    const refused = upgradeDeck(db, c, DAISY, added);
    expect(refused.ok).toBe(false);
  });
});
