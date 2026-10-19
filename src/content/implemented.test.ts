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

describe("on the real content", () => {
  let real: ContentDb;
  beforeAll(async () => {
    real = (await loadContentFromDisk()).db;
  });

  it("the Ghoul Priest, the Ravenous Ghoul and the three Arkham Woods work by their data", () => {
    for (const code of ["01116", "01161", "01152", "01153", "01154"]) expect(implemented(real, code), code).toBe(true);
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
