import { beforeAll, describe, expect, it } from "vitest";
import { fromArkhamDb, needsChoice, validateDeck, whyNot, whyNotReplace } from "./decks";
import type { ContentDb } from "./types";
import type { DeckDef } from "../content/schema";
import { loadContentFromDisk } from "../content/node";
import { db } from "./testkit";

describe("decks", () => {
  it("all starter decks are valid", async () => {
    // every pack loaded: the browser's content holds the other packs' cards only when something asks for them
    const all = (await loadContentFromDisk()).db;
    // ArkhamCards' lists for Tommy Muldoon (29 cards) and Dexter Drake (32) do not add up to 30: kept as published, and the wizard says so
    const upstream: Record<string, string> = { "06001-starter": "deck.size", "07004-starter": "deck.size" };
    // an investigator whose deck needs a choice the builder lacks is refused, whatever the deck
    for (const d of Object.values(all.decks)) expect(validateDeck(all, d).map((p) => p.reason?.key), d.id).toEqual(needsChoice(all.investigators[d.investigator]) ? [needsChoice(all.investigators[d.investigator])!.key] : upstream[d.id] ? [upstream[d.id]] : []);
  });

  it("rejects too many copies", () => {
    const d = structuredClone(db.decks["roland-starter"]);
    d.cards["01086"] = 3;
    expect(validateDeck(db, d).map((p) => p.message)).toContainEqual(expect.stringMatching(/too many copies of Knife/));
  });

  it("rejects off-class and missing signature cards", () => {
    const d = structuredClone(db.decks["roland-starter"]);
    delete d.cards["01006"];
    d.cards["01060"] = 1; // Shrivelling (mystic)
    const msgs = validateDeck(db, d).map((p) => p.message);
    expect(msgs).toContainEqual(expect.stringMatching(/missing required card Roland's .38 Special/));
    expect(msgs).toContainEqual(expect.stringMatching(/Shrivelling .* not allowed/));
  });

  it("passes what it cannot judge: with trait or exclusion options present a card is not refused, with only faction and level options it is", () => {
    const rex = structuredClone(db.investigators["01001"]);
    const mk = (deckOptions: typeof rex.deckOptions) => ({ ...db, investigators: { ...db.investigators, "01001": { ...rex, deckOptions } } });
    const d = structuredClone(db.decks["roland-starter"]);
    d.cards["01060"] = 1; // Shrivelling (mystic)
    const notAllowed = (x: typeof db) => validateDeck(x, d).some((p) => p.reason?.key === "deck.notAllowed" && p.code === "01060");
    expect(notAllowed(mk([{ faction: ["guardian", "neutral"], level: { min: 0, max: 5 }, }, { not: true, trait: ["spell"] }, { trait: ["tool"], level: { min: 0, max: 5 } }]))).toBe(false);
    expect(notAllowed(mk([{ faction: ["guardian", "neutral"], level: { min: 0, max: 5 } }]))).toBe(true);
  });

  it("imports an ArkhamDB deck export", () => {
    const slots: Record<string, number> = { "01006": 1, "01007": 1, "01000": 1 };
    for (const c of ["01016", "01017", "01018", "01019", "01020", "01021", "01022", "01023", "01024", "01025", "01030", "01031", "01032", "01033", "01034", "01035", "01036", "01037", "01038", "01039"]) slots[c] = 1;
    Object.assign(slots, { "01086": 2, "01087": 2, "01088": 2, "01089": 2, "01092": 2 });
    const d = fromArkhamDb({ id: 101, name: "Fed", investigator_code: "01001", slots });
    expect(d.randomBasicWeakness).toBe(true);
    expect(d.cards["01000"]).toBeUndefined();
    expect(validateDeck(db, d)).toEqual([]);
  });
});


describe("the generic deckbuilding rules", () => {
  let all: ContentDb;
  beforeAll(async () => {
    all = (await loadContentFromDisk()).db;
  });
  const keys = (d: DeckDef) => validateDeck(all, d).map((p) => p.reason?.key);
  const off = (factions: string[], n: number, notIn: Set<string>) =>
    Object.values(all.cards).filter((c) => factions.includes(c.faction) && ["asset", "event", "skill"].includes(c.type) && (c.xp ?? 0) === 0 && !c.subtype && !c.encounterSet && (c.deckLimit ?? 2) > 0 && !notIn.has(c.code) && c.faction !== "mythos").filter((c, i, a) => a.findIndex((x) => x.name === c.name) === i).slice(0, n).map((c) => c.code);

  it("Zoey Samaras: five off-class level 0 cards are fine, the sixth is one too many, in plain words", () => {
    const zoey = all.decks["02001-starter"];
    const own = (c: string) => ["guardian", "neutral"].includes(all.cards[c].faction);
    const fixed = new Set(["02006", "02007"]);
    // her starter with no off-class card, then exactly m cards of other classes, 30 cards in all
    const build = (m: number): DeckDef => {
      const d = structuredClone(zoey);
      for (const c of Object.keys(d.cards)) if (!own(c) && !fixed.has(c) && !all.cards[c].subtype) delete d.cards[c];
      const size = () => Object.entries(d.cards).filter(([c]) => !fixed.has(c) && !all.cards[c].subtype).reduce((n, [, k]) => n + k, 0);
      for (const c of off(["mystic"], m, new Set())) d.cards[c] = 1;
      // reprints share a title with the original: take cards whose title is not in the deck yet
      const titles = new Set(Object.keys(d.cards).map((c) => all.cards[c].name));
      const pool = off(["guardian"], 400, new Set()).filter((c) => !titles.has(all.cards[c].name)).slice(0, 40);
      for (const c of pool) if (size() < 30) d.cards[c] = 1;
      for (const c of Object.keys(d.cards)) while (size() > 30 && own(c) && !fixed.has(c) && d.cards[c]) {
        if (d.cards[c] > 1) d.cards[c] -= 1;
        else delete d.cards[c];
      }
      for (const c of Object.keys(d.cards)) if (size() < 30 && own(c) && !fixed.has(c)) d.cards[c] = Math.min(all.cards[c].deckLimit ?? 2, (d.cards[c] ?? 0) + 1);
      return d;
    };
    expect(keys(build(5))).toEqual([]);
    expect(keys(build(6))).toEqual(["deck.optionLimit"]);
  });

  it("Carolyn Fern: a level 3 card from another class that heals horror is allowed, one that does not is refused", () => {
    const base = all.decks["05001-starter"];
    const heals = Object.values(all.cards).find((c) => !["guardian", "neutral"].includes(c.faction) && c.faction !== "mythos" && (c.tags ?? []).includes("hh") && (c.xp ?? 0) >= 2 && (c.xp ?? 0) <= 5 && ["asset", "event", "skill"].includes(c.type) && !c.subtype)!;
    expect(heals).toBeDefined();
    expect(whyNot(all, base, heals.code)).toBeNull();
    const plain = Object.values(all.cards).find((c) => c.faction === "mystic" && (c.xp ?? 0) === 3 && !(c.tags ?? []).includes("hh") && !(c.tags ?? []).includes("hd") && c.type === "asset")!;
    expect(whyNot(all, base, plain.code)?.key).toBe("deck.notAllowed");
  });

  it("a trait rule: Ursula Downs takes Relic cards of other classes up to level 4", () => {
    const base = all.decks["04002-starter"];
    const relic = Object.values(all.cards).find((c) => c.faction === "rogue" && c.traits.includes("Relic") && (c.xp ?? 0) <= 4 && c.type === "asset" && !c.subtype)!;
    expect(whyNot(all, base, relic.code)).toBeNull();
    const rogue = Object.values(all.cards).find((c) => c.faction === "rogue" && !c.traits.includes("Relic") && (c.xp ?? 0) === 1 && c.type === "asset" && !c.subtype)!;
    expect(whyNot(all, base, rogue.code)?.key).toBe("deck.notAllowed");
  });

  it("an exclusion: Preston Fairmont may not take Illicit cards even of his own class", () => {
    const base = all.decks["05003-starter"];
    const illicit = Object.values(all.cards).find((c) => c.faction === "rogue" && c.traits.includes("Illicit") && (c.xp ?? 0) === 0 && c.type === "asset" && !c.subtype)!;
    expect(whyNot(all, base, illicit.code)?.key).toBe("deck.excluded");
    const fine = Object.values(all.cards).find((c) => c.faction === "rogue" && !c.traits.includes("Illicit") && (c.xp ?? 0) === 0 && c.type === "asset" && !c.subtype)!;
    expect(whyNot(all, base, fine.code)).toBeNull();
  });

  it("at least: a deck short of cards from enough classes says so", () => {
    const inv = { ...all.investigators["01001"], deckOptions: [{ faction: ["guardian", "seeker", "neutral"], level: { min: 0, max: 5 }, atleast: { factions: 4, min: 5 } }] };
    const d = { ...all, investigators: { ...all.investigators, "01001": inv } };
    const problems = validateDeck(d, all.decks["roland-starter"]).map((p) => p.reason?.key);
    expect(problems).toContain("deck.atLeast");
    const ok = { ...inv, deckOptions: [{ faction: ["guardian", "seeker", "neutral"], level: { min: 0, max: 5 }, atleast: { factions: 2, min: 5 } }] };
    expect(validateDeck({ ...all, investigators: { ...all.investigators, "01001": ok } }, all.decks["roland-starter"]).map((p) => p.reason?.key)).not.toContain("deck.atLeast");
  });

  it("copies are counted by title across levels", () => {
    const d = structuredClone(all.decks["roland-starter"]);
    const l2 = Object.values(all.cards).find((c) => c.name === ".45 Automatic" && c.xp === 2)!;
    d.cards["01016"] = 2;
    d.cards[l2.code] = 1;
    expect(validateDeck(all, d).map((p) => p.reason?.key)).toContain("deck.copies");
  });

  it("refuses an investigator whose deck needs a choice the builder does not offer, in plain words", () => {
    expect(needsChoice(all.investigators["03006"])?.key).toBe("deck.choice.role"); // Lola Hayes
    expect(needsChoice(all.investigators["06002"])?.key).toBe("deck.choice.size"); // Mandy Thompson
    expect(needsChoice(all.investigators["01001"])).toBeUndefined();
    expect(needsChoice(all.investigators["05001"])).toBeUndefined();
    expect(validateDeck(all, { id: "x", name: "x", investigator: "03006", cards: {}, randomBasicWeakness: true }).map((p) => p.reason?.key)).toEqual(["deck.choice.role"]);
  });

  it("whyNot ignores what a single card cannot change (size, signatures)", () => {
    expect(whyNot(all, { id: "x", name: "x", investigator: "01001", cards: {}, randomBasicWeakness: true }, "01016")).toBeNull();
  });
});


describe("whyNotReplace", () => {
  const roland = () => structuredClone(db.decks["roland-starter"]);
  /** a level 0 card Roland may take that his deck has no copy of (by title) */
  const spare = () => {
    const d = roland();
    const signatures = new Set(Object.values(db.investigators).flatMap((i) => [...i.signatures, ...i.weaknesses]));
    return Object.values(db.cards).find((c) => !signatures.has(c.code) && ["guardian", "seeker", "neutral"].includes(c.faction) && ["asset", "event", "skill"].includes(c.type) && (c.xp ?? 0) === 0 && !c.subtype && !c.encounterSet && (c.deckLimit ?? 2) >= 1 && !Object.keys(d.cards).some((k) => db.cards[k].name === c.name))!.code;
  };
  it("a swap the rules allow: nothing to say, even at the deck's full size", () => {
    expect(whyNotReplace(db, roland(), "01087", spare())).toBeNull();
  });
  it("a swap that breaks a rule says which", () => {
    expect(whyNotReplace(db, roland(), "01087", "01060")?.key).toBe("deck.notAllowed"); // Shrivelling is a mystic card
  });
  it("a required card can't be swapped out", () => {
    expect(whyNotReplace(db, roland(), "01006", spare())?.key).toBe("deck.missing");
  });
});

describe("multi-class cards", () => {
  it("are allowed when the investigator has access to any of their classes", () => {
    const d2 = { ...db, cards: { ...db.cards } } as ContentDb;
    d2.cards["05118"] = { ...db.cards["01060"], code: "05118", name: "Enchanted Blade", faction: "mystic", factions: ["mystic", "guardian"], xp: 0 };
    const deck = structuredClone(db.decks["roland-starter"]);
    delete deck.cards["01086"];
    deck.cards["05118"] = 2;
    expect(validateDeck(d2, deck)).toEqual([]);
  });
});
