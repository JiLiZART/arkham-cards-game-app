import { beforeAll, describe, expect, it } from "vitest";
import type { ContentDb } from "../engine/world/types";
import { implemented, tokensReal } from "./implemented";
import { Keyword } from "./schema";
import { loadContentFromDisk } from "./node";

/** a one-card content: the card's text and whatever behaviour fields the test sets */
const db = (text: string, over: object = {}): ContentDb =>
  ({
    cards: { c: { code: "c", type: "enemy", text, abilities: [], ...over } },
    scripts: {},
  }) as unknown as ContentDb;

describe("a card works when every printed line is accounted for", () => {
  it("a Prey line is accounted for by prey", () => {
    expect(
      implemented(
        db("<b>Prey</b> - Highest [combat].\nHunter. Retaliate.", { prey: { highest: "combat" } }),
        "c",
      ),
    ).toBe(true);
    expect(implemented(db("<b>Prey</b> - Highest [combat].\nHunter. Retaliate."), "c")).toBe(false);
  });

  it("an 'investigated using' line is accounted for by investigateSkill", () => {
    const text =
      "This location is investigated using [willpower] instead of the skill indicated by the investigation attempt.";
    expect(implemented(db(text, { investigateSkill: "willpower" }), "c")).toBe(true);
    expect(implemented(db(text), "c")).toBe(false);
  });

  it("a Uses line is accounted for by uses, a Max committed line by maxCommitted", () => {
    expect(implemented(db("Uses (2 ammo).", { uses: { type: "ammo", count: 2 } }), "c")).toBe(true);
    expect(implemented(db("Uses (2 ammo)."), "c")).toBe(false);
    expect(implemented(db("Max 1 committed per skill test.", { maxCommitted: 1 }), "c")).toBe(true);
    expect(implemented(db("Max 1 committed per skill test."), "c")).toBe(false);
  });

  it("a covered line does not cover the others", () => {
    expect(
      implemented(
        db(
          "<b>Prey</b> - Fewest cards in hand.\n<b>Forced</b> - After this attacks you: Discard 1 card at random.",
          { prey: "bearer" },
        ),
        "c",
      ),
    ).toBe(false);
  });

  it("abilities or a script still account for the whole card; no text and keywords and spawn lines as before", () => {
    expect(implemented(db("<b>Forced</b> - Do a thing.", { abilities: [{}] }), "c")).toBe(true);
    expect(implemented(db(""), "c")).toBe(true);
    expect(implemented(db("Hunter. Retaliate."), "c")).toBe(true);
  });

  it("a keyword with an argument is accounted for when the card's keywords hold it as data", () => {
    const patrol = "Patrol (nearest location with no [[Elite]] enemies).";
    expect(
      implemented(db(patrol, { keywords: [{ patrol: { nearest: true, noElite: true } }] }), "c"),
    ).toBe(true);
    expect(implemented(db(patrol, { keywords: ["patrol"] }), "c")).toBe(false);
    expect(implemented(db(patrol), "c")).toBe(false);
    expect(
      implemented(db("Swarming 2. Hunter.", { keywords: [{ swarming: 2 }, "hunter"] }), "c"),
    ).toBe(true);
    expect(
      implemented(db("Predator (Civilian).", { keywords: [{ predator: "Civilian" }] }), "c"),
    ).toBe(true);
    for (const k of ["Hidden", "Relentless", "Veiled", "Exile"])
      expect(implemented(db(`${k}.`), "c"), k).toBe(true);
    // Researched needs the log entry it is gated by
    expect(implemented(db("Researched."), "c")).toBe(false);
    expect(
      implemented(
        db("Researched.", { keywords: [{ researched: { log: "identifiedTheSolution" } }] }),
        "c",
      ),
    ).toBe(true);
  });

  it("the schema accepts every keyword, plain and with its argument", () => {
    const keywords = [
      "hidden",
      "relentless",
      "veiled",
      "exile",
      { patrol: { nearest: true, noElite: true } },
      { bonded: "05313" },
      { swarming: 2 },
      { predator: "Civilian" },
      { researched: { log: "identifiedTheSolution" } },
    ];
    expect(Keyword.array().safeParse(keywords).success).toBe(true);
    expect(Keyword.safeParse({ patrol: 3 }).success).toBe(false);
  });

  it("a Spawn line is accounted for by a spawn expression (Waterfront Civilian: any empty Arkham location)", () => {
    expect(
      implemented(
        db("Spawn - Any empty [[Arkham]] location.", { spawn: { trait: "Arkham", empty: true } }),
        "c",
      ),
    ).toBe(true);
    expect(implemented(db("Spawn - Any empty [[Arkham]] location."), "c")).toBe(false);
  });
});

/** a scenario "s" whose reference card "r" prints these lines, with these token tables */
const scenario = (front: string, back: string | undefined, tokens: object): ContentDb =>
  ({
    cards: { r: { code: "r", type: "scenario", text: front, backText: back, abilities: [] } },
    scenarios: { s: { id: "s", card: "r", tokens } },
    scripts: {},
  }) as unknown as ContentDb;
const FRONT =
  "Easy / Standard\n[skull] -X. X is the number of [[Ghoul]] enemies at your location.\n[cultist] -1. If you fail, take 1 horror.\n[tablet] -2. If there is a [[Ghoul]] enemy at your location, take 1 damage.";
const BACK =
  "Hard / Expert\n[skull] -2. If you fail, after this skill test, search the encounter deck for a [[Ghoul]] enemy, and draw it. Shuffle the encounter deck.\n[cultist] Reveal another token. If you fail, take 2 horror.\n[tablet] -4. If there is a [[Ghoul]] enemy at your location, take 1 damage and 1 horror.";
const easyStd = {
  skull: { modifier: "X", x: "ghoulsAtYourLocation" },
  cultist: { modifier: -1, onFail: [{}] },
  tablet: { modifier: -2, condition: {}, onReveal: [{}] },
};
const hardExp = {
  skull: { modifier: -2, onFail: [{}] },
  cultist: { modifier: 0, revealAnother: true, onFail: [{}] },
  tablet: { modifier: -4, condition: {}, onReveal: [{}] },
};
const all = { easy: easyStd, standard: easyStd, hard: hardExp, expert: hardExp };

describe("a scenario reference card works when its token lines are real", () => {
  it("every line covered on all four difficulties", () => {
    expect(implemented(scenario(FRONT, BACK, all), "r")).toBe(true);
  });

  it("a colon after the token, with or without a space before it, makes no difference", () => {
    const flat = {
      skull: { modifier: "X", x: "ghoulsAtYourLocation" },
      cultist: { modifier: -1 },
      tablet: { modifier: -2 },
    };
    expect(
      implemented(
        scenario(
          "[skull] : -X. X is the number of Ghouls.\n[cultist]: -1.\n[tablet] -2.",
          undefined,
          { easy: flat, standard: flat, hard: flat, expert: flat },
        ),
        "r",
      ),
    ).toBe(true);
  });

  it("a conditional line is covered only by an X the engine computes, not by any declared X", () => {
    const unknownX = { ...easyStd, skull: { modifier: "X", x: "notAnEngineValue" } };
    const tokens = { easy: unknownX, standard: unknownX, hard: hardExp, expert: hardExp };
    expect(tokensReal(scenario(FRONT, BACK, tokens), "s")).toBe(false);
    expect(tokensReal(scenario(FRONT, BACK, all), "s")).toBe(true);
  });

  it("only Easy and Standard written: the back's lines are not covered", () => {
    expect(implemented(scenario(FRONT, BACK, { easy: easyStd, standard: easyStd }), "r")).toBe(
      false,
    );
  });

  it("placeholders (modifiers only) do not cover X, a failure effect or a reveal effect", () => {
    const flat = { skull: { modifier: -1 }, cultist: { modifier: -1 }, tablet: { modifier: -2 } };
    expect(
      implemented(
        scenario(FRONT, BACK, { easy: flat, standard: flat, hard: flat, expert: flat }),
        "r",
      ),
    ).toBe(false);
  });

  it("a '-3 instead if' line is covered by the entry's `instead`, not by a bare modifier", () => {
    const text =
      "Easy / Standard\n[skull] -1. -3 instead if you have 3 or more horror.\n[cultist] -1.\n[tablet] -2.";
    const entry = (skull: object) => {
      const t = { skull, cultist: { modifier: -1 }, tablet: { modifier: -2 } };
      return { easy: t, standard: t, hard: t, expert: t };
    };
    const instead = { modifier: -1, instead: { when: { horror: { min: 3 } }, modifier: -3 } };
    expect(implemented(scenario(text, undefined, entry(instead)), "r")).toBe(true);
    expect(implemented(scenario(text, undefined, entry({ modifier: -1 })), "r")).toBe(false);
  });

  it("a bare modifier line needs only the modifier", () => {
    const flat = { skull: { modifier: -1 }, cultist: { modifier: -1 }, tablet: { modifier: -2 } };
    expect(
      implemented(
        scenario("Easy / Standard\n[skull] -1.\n[cultist] -1.\n[tablet] -2.", undefined, {
          easy: flat,
          standard: flat,
          hard: flat,
          expert: flat,
        }),
        "r",
      ),
    ).toBe(true);
  });

  it("empty token tables (a Return-to scenario) do not work although the card prints no token lines", () => {
    expect(
      implemented(
        scenario("Perform the setup as in the Campaign Guide.", undefined, {
          easy: {},
          standard: {},
          hard: {},
          expert: {},
        }),
        "r",
      ),
    ).toBe(false);
  });

  it("a reference card two scenarios share works only when it is real for both; each scenario is judged by its own tokens", () => {
    const d = scenario(FRONT, BACK, all);
    d.scenarios.t = {
      id: "t",
      card: "r",
      tokens: { easy: {}, standard: {}, hard: {}, expert: {} },
    } as never; // a Return-to scenario, tokens not written yet
    expect(implemented(d, "r")).toBe(false);
    expect(tokensReal(d, "s")).toBe(true);
    expect(tokensReal(d, "t")).toBe(false);
  });

  it("a reference card no scenario uses does not work", () => {
    const d = scenario(FRONT, BACK, all);
    d.scenarios = {};
    expect(implemented(d, "r")).toBe(false);
  });
});

describe("on the real content", () => {
  let real: ContentDb;
  beforeAll(async () => {
    real = (await loadContentFromDisk()).db;
  });

  it("the Ghoul Priest, the Ravenous Ghoul and the three Arkham Woods work by their data", () => {
    for (const code of ["01116", "01161", "01152", "01153", "01154"])
      expect(implemented(real, code), code).toBe(true);
  });

  it("Night of the Zealot's scenarios are real on all four difficulties, and so is the card they share with Return to", () => {
    for (const id of ["the-gathering", "the-midnight-masks", "the-devourer-below"])
      expect(tokensReal(real, id), id).toBe(true);
    // return-to-the-gathering plays with it, with the hand-written scenario's token tables (import:campaigns)
    expect(implemented(real, "01104")).toBe(true);
  });

  it("a generated scenario's tokens are placeholders", () => {
    expect(tokensReal(real, "curtain-call")).toBe(false);
  });

  it("over every scenario: Night of the Zealot's and The Dunwich Legacy's tokens are real, the generated placeholders are not", () => {
    const hand = (id: string) => real.campaigns[id].scenarios;
    for (const id of [...hand("night-of-the-zealot"), ...hand("the-dunwich-legacy")])
      expect(tokensReal(real, id), id).toBe(true);
    // a generated scenario plays with the hand-written token tables only on a hand-written scenario's card (Return to)
    const handCards = new Set(
      Object.values(real.campaigns)
        .filter((c) => !c.generated)
        .flatMap((c) => c.scenarios.map((id) => real.scenarios[id].card)),
    );
    const generated = Object.values(real.campaigns)
      .filter((c) => c.generated)
      .flatMap((c) => c.scenarios)
      .filter((id) => real.scenarios[id] && !handCards.has(real.scenarios[id].card));
    expect(generated.length).toBeGreaterThan(100);
    for (const id of generated) expect(tokensReal(real, id), id).toBe(false);
  });

  it("Crazed Shoggoth works by its data: a spawn expression and killsOnDefeat; without killsOnDefeat its Forced line is not covered", () => {
    expect(implemented(real, "02295")).toBe(true);
    const bare = { ...real.cards["02295"], killsOnDefeat: undefined };
    expect(implemented({ ...real, cards: { ...real.cards, "02295": bare } }, "02295")).toBe(false);
  });

  it("Where Doom Awaits' tokens are real: the tablet's automatic failure instead and the cultist's cancelled skill cards", () => {
    expect(tokensReal(real, "where-doom-awaits")).toBe(true);
  });

  it("a card with a Forced line and no behaviour does not work", () => {
    // Grave-Eater of Return to Night of the Zealot: a Forced discard, no abilities
    expect(implemented(real, "50038")).toBe(false);
  });

  it("across the cycles, a Prey line works only where prey is set", () => {
    const withPrey = Object.values(real.cards).filter(
      (c) =>
        /^Prey - /m.test(c.text.replace(/<[^>]+>/g, "")) &&
        !c.abilities.length &&
        !real.scripts[c.code],
    );
    expect(withPrey.length).toBeGreaterThan(30);
    for (const c of withPrey.filter((c) => !c.prey))
      expect(implemented(real, c.code), c.code).toBe(false);
  });
});

describe("the printed lines are read the way the card prints them", () => {
  it("lines separated by <br/> are separate lines", () => {
    expect(
      implemented(
        db(
          "<b>Spawn</b> - Any empty location.<br/><b>Forced</b> - After this spawns: Place 1 doom on it.",
          { spawn: "emptyLocation" },
        ),
        "c",
      ),
    ).toBe(false);
  });

  it("a Spawn line is accounted for only by a spawn the engine can resolve", () => {
    expect(
      implemented(db("<b>Spawn</b> - Any empty location.", { spawn: "emptyLocation" }), "c"),
    ).toBe(true);
    expect(
      implemented(db("<b>Spawn</b> - Engaged with prey.", { spawn: "Engaged with Prey" }), "c"),
    ).toBe(true);
    expect(
      implemented(
        db("<b>Spawn</b> - Location with the most clues.", {
          spawn: "Location with the most clues",
        }),
        "c",
      ),
    ).toBe(false);
    const withLoc = db("<b>Spawn</b> - Hallway.", { spawn: "Hallway" });
    expect(implemented(withLoc, "c")).toBe(false);
    (withLoc.cards as Record<string, object>).h = {
      code: "h",
      type: "location",
      name: "Hallway",
      text: "",
      abilities: [],
    };
    expect(implemented(withLoc, "c")).toBe(true);
  });

  it("the back of a double-sided card is printed text too", () => {
    expect(
      implemented(
        db("", {
          type: "agenda",
          backText: "Each investigator takes 1 horror. Advance to agenda 2a.",
        }),
        "c",
      ),
    ).toBe(false);
    expect(implemented(db("", { type: "agenda", backText: "" }), "c")).toBe(true);
  });
});
