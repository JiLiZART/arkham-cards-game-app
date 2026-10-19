import { beforeAll, describe, expect, it } from "vitest";
import type { ContentDb } from "../engine/types";
import { implemented } from "./implemented";
import { loadContentFromDisk } from "./node";

/** a one-card content: the card's text and whatever behaviour fields the test sets */
const db = (text: string, over: object = {}): ContentDb =>
  ({ cards: { c: { code: "c", type: "enemy", text, abilities: [], ...over } }, scripts: {} }) as unknown as ContentDb;

describe("a card works when every printed line is accounted for", () => {
  it("a Prey line is accounted for by prey", () => {
    expect(implemented(db("<b>Prey</b> - Highest [combat].\nHunter. Retaliate.", { prey: { highest: "combat" } }), "c")).toBe(true);
    expect(implemented(db("<b>Prey</b> - Highest [combat].\nHunter. Retaliate."), "c")).toBe(false);
  });

  it("an 'investigated using' line is accounted for by investigateSkill", () => {
    const text = "This location is investigated using [willpower] instead of the skill indicated by the investigation attempt.";
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
    expect(implemented(db("<b>Prey</b> - Fewest cards in hand.\n<b>Forced</b> - After this attacks you: Discard 1 card at random.", { prey: "bearer" }), "c")).toBe(false);
  });

  it("abilities or a script still account for the whole card; no text and keywords and spawn lines as before", () => {
    expect(implemented(db("<b>Forced</b> - Do a thing.", { abilities: [{}] }), "c")).toBe(true);
    expect(implemented(db(""), "c")).toBe(true);
    expect(implemented(db("Hunter. Retaliate."), "c")).toBe(true);
    expect(implemented(db("Spawn - Hallway."), "c")).toBe(true);
  });
});

/** a scenario "s" whose reference card "r" prints these lines, with these token tables */
const scenario = (front: string, back: string | undefined, tokens: object): ContentDb =>
  ({
    cards: { r: { code: "r", type: "scenario", text: front, backText: back, abilities: [] } },
    scenarios: { s: { id: "s", card: "r", tokens } },
    scripts: {},
  }) as unknown as ContentDb;
const FRONT = "Easy / Standard\n[skull] -X. X is the number of [[Ghoul]] enemies at your location.\n[cultist] -1. If you fail, take 1 horror.\n[tablet] -2. If there is a [[Ghoul]] enemy at your location, take 1 damage.";
const BACK = "Hard / Expert\n[skull] -2. If you fail, after this skill test, search the encounter deck for a [[Ghoul]] enemy, and draw it.\n[cultist] Reveal another token. If you fail, take 2 horror.\n[tablet] -4. If there is a [[Ghoul]] enemy at your location, take 1 damage and 1 horror.";
const easyStd = { skull: { modifier: "X", x: "ghoulsAtYourLocation" }, cultist: { modifier: -1, onFail: [{}] }, tablet: { modifier: -2, condition: {}, onReveal: [{}] } };
const hardExp = { skull: { modifier: -2, onFail: [{}] }, cultist: { modifier: 0, revealAnother: true, onFail: [{}] }, tablet: { modifier: -4, condition: {}, onReveal: [{}] } };
const all = { easy: easyStd, standard: easyStd, hard: hardExp, expert: hardExp };

describe("a scenario reference card works when its token lines are real", () => {
  it("every line covered on all four difficulties", () => {
    expect(implemented(scenario(FRONT, BACK, all), "r")).toBe(true);
  });

  it("a colon after the token, with or without a space before it, makes no difference", () => {
    const flat = { skull: { modifier: "X", x: "ghoulsAtYourLocation" }, cultist: { modifier: -1 }, tablet: { modifier: -2 } };
    expect(implemented(scenario("[skull] : -X. X is the number of Ghouls.\n[cultist]: -1.\n[tablet] -2.", undefined, { easy: flat, standard: flat, hard: flat, expert: flat }), "r")).toBe(true);
  });

  it("only Easy and Standard written: the back's lines are not covered", () => {
    expect(implemented(scenario(FRONT, BACK, { easy: easyStd, standard: easyStd }), "r")).toBe(false);
  });

  it("placeholders (modifiers only) do not cover X, a failure effect or a reveal effect", () => {
    const flat = { skull: { modifier: -1 }, cultist: { modifier: -1 }, tablet: { modifier: -2 } };
    expect(implemented(scenario(FRONT, BACK, { easy: flat, standard: flat, hard: flat, expert: flat }), "r")).toBe(false);
  });

  it("a bare modifier line needs only the modifier", () => {
    const flat = { skull: { modifier: -1 }, cultist: { modifier: -1 }, tablet: { modifier: -2 } };
    expect(implemented(scenario("Easy / Standard\n[skull] -1.\n[cultist] -1.\n[tablet] -2.", undefined, { easy: flat, standard: flat, hard: flat, expert: flat }), "r")).toBe(true);
  });

  it("empty token tables (a Return-to scenario) do not work although the card prints no token lines", () => {
    expect(implemented(scenario("Perform the setup as in the Campaign Guide.", undefined, { easy: {}, standard: {}, hard: {}, expert: {} }), "r")).toBe(false);
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
    for (const code of ["01116", "01161", "01152", "01153", "01154"]) expect(implemented(real, code), code).toBe(true);
  });

  it("Night of the Zealot's reference cards are not yet real on Hard and Expert, a generated one is a placeholder", () => {
    expect(implemented(real, "01104")).toBe(false);
    expect(implemented(real, "02041")).toBe(false); // Extracurricular Activity
  });

  it("a card with a Forced line and no behaviour does not work", () => {
    // Grave-Eater of Return to Night of the Zealot: a Forced discard, no abilities
    expect(implemented(real, "50038")).toBe(false);
  });

  it("across the cycles, a Prey line works only where prey is set", () => {
    const withPrey = Object.values(real.cards).filter((c) => /^Prey - /m.test(c.text.replace(/<[^>]+>/g, "")) && !c.abilities.length && !real.scripts[c.code]);
    expect(withPrey.length).toBeGreaterThan(30);
    for (const c of withPrey.filter((c) => !c.prey)) expect(implemented(real, c.code), c.code).toBe(false);
  });
});
