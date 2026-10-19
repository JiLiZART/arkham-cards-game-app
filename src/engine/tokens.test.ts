import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { card, createCard, findByCode, matchesFilter, moveCard, type G } from "./core";
import { commitDone, db, gOf, mutate, pick, skipMulligans, start } from "./testkit";
import type { TokenEffect } from "../content/schema";

const ROLAND = "01001";
const GHOUL = "01161"; // Ravenous Ghoul

/** the Gathering's standard skull, replaced for a test and put back after */
const tokens = db.scenarios["the-gathering"].tokens;
let saved: TokenEffect | undefined;
const setSkull = (e: TokenEffect) => (tokens.standard!.skull = e);
beforeEach(() => {
  saved = tokens.standard!.skull;
});
afterEach(() => {
  tokens.standard!.skull = saved!;
});

/** take every Ghoul enemy out of the encounter deck and its discard pile */
const noGhouls = (g: G) => {
  for (const id of [...g.s.encounterDeck, ...g.s.encounterDiscard]) if (matchesFilter(g, card(g, id).code, { type: "enemy", trait: "Ghoul" })) moveCard(g, id, "removed");
};

/** Roland investigates the Study with the bag holding only `token`, and fails it (intellect 3 against shroud 2 with -2) */
const failInvestigate = (r = skipMulligans(start("the-gathering", [ROLAND], 1, { chaosBag: ["skull"] as never }))) => commitDone(pick(r, "Investigate Study"));

describe("searchEncounterDraw: search the encounter deck and discard pile for an enemy and draw it", () => {
  const search: TokenEffect = { modifier: -2, onFail: [{ op: "searchEncounterDraw", filter: { type: "enemy", trait: "Ghoul" } }] };

  it("takes the enemy from the discard pile; the investigator draws it and it engages them", () => {
    setSkull(search);
    let r = skipMulligans(start("the-gathering", [ROLAND], 1, { chaosBag: ["skull"] as never }));
    let ghoul = "";
    r = mutate(r, (g) => {
      noGhouls(g);
      ghoul = createCard(g, GHOUL, "limbo");
      moveCard(g, ghoul, "encounterDiscard");
    });
    r = failInvestigate(r);
    const g = gOf(r);
    expect(card(g, ghoul).zone).toBe("enemy");
    expect(card(g, ghoul).engagedWith).toBe(ROLAND);
    expect(r.state.encounterDiscard).not.toContain(ghoul);
  });

  it("takes the enemy from the deck when it is there, and shuffles the deck", () => {
    setSkull(search);
    let r = skipMulligans(start("the-gathering", [ROLAND], 1, { chaosBag: ["skull"] as never }));
    let ghoul = "";
    r = mutate(r, (g) => {
      noGhouls(g);
      ghoul = createCard(g, GHOUL, "encounterDeck");
    });
    const before = [...r.state.encounterDeck];
    r = failInvestigate(r);
    const g = gOf(r);
    expect(card(g, ghoul).zone).toBe("enemy");
    expect(r.state.encounterDeck).toHaveLength(before.length - 1);
    expect(r.state.log.some((e) => /shuffles the encounter deck/.test(e.text))).toBe(true);
  });

  it("does nothing when no such enemy is left", () => {
    setSkull(search);
    let r = skipMulligans(start("the-gathering", [ROLAND], 1, { chaosBag: ["skull"] as never }));
    r = mutate(r, noGhouls);
    const enemies = (x: typeof r) => Object.values(x.state.cards).filter((c) => c.zone === "enemy").length;
    const before = enemies(r);
    r = failInvestigate(r);
    expect(enemies(r)).toBe(before);
    expect(findByCode(gOf(r), GHOUL, ["enemy"])).toBeUndefined();
  });
});
