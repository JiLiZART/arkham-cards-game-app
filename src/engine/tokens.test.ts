import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { card, createCard, findByCode, matchesFilter, moveCard, type G } from "./core";
import { commitDone, db, gOf, mutate, pick, putEnemy, locId, skipMulligans, start } from "./testkit";
import { TokenEffect } from "../content/schema";

const ROLAND = "01001";
const GHOUL = "01161"; // Ravenous Ghoul

/** the Gathering's standard skull, replaced for a test and put back after */
const tokens = db.scenarios["the-gathering"].tokens;
let saved: TokenEffect | undefined;
const setSkull = (e: TokenEffect) => (tokens.standard!.skull = e);
const savedTablet = tokens.standard!.tablet;
beforeEach(() => {
  saved = tokens.standard!.skull;
});
afterEach(() => {
  tokens.standard!.skull = saved!;
  tokens.standard!.tablet = savedTablet;
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

describe("revealAnother with a condition", () => {
  /** play the investigation on seeds 1..30 with a bag of one tablet and one +1; how many tokens were revealed, and was the first the tablet */
  const sweep = (ghoulInPlay: boolean) =>
    Array.from({ length: 30 }, (_, k) => {
      let r = skipMulligans(start("the-gathering", [ROLAND], k + 1, { chaosBag: ["tablet", "+1"] as never }));
      r = mutate(r, (g) => {
        if (ghoulInPlay) putEnemy(g, "01160", locId(g, "01111"));
      });
      r = commitDone(pick(r, "Investigate Study"));
      const revealed = r.state.log.filter((e) => e.type === "token").map((e) => (e.data as { token: string }).token);
      return { first: revealed[0], count: revealed.length };
    });
  const noGhoulCondition: TokenEffect = { modifier: -2, revealAnother: { if: { not: { enemyInPlay: { type: "enemy", trait: "Ghoul" } } } } };

  it("reveals another token when the condition holds: no Ghoul enemy in play", () => {
    tokens.standard!.tablet = noGhoulCondition;
    const runs = sweep(false);
    expect(runs.some((x) => x.first === "tablet")).toBe(true);
    for (const x of runs) expect(x.count, x.first).toBe(x.first === "tablet" ? 2 : 1);
  });

  it("does not when it fails: a Ghoul enemy is in play", () => {
    tokens.standard!.tablet = noGhoulCondition;
    const runs = sweep(true);
    expect(runs.some((x) => x.first === "tablet")).toBe(true);
    for (const x of runs) expect(x.count).toBe(1);
  });

  it("the old forms stay valid", () => {
    expect(TokenEffect.safeParse({ modifier: -1, revealAnother: true }).success).toBe(true);
    expect(TokenEffect.safeParse({ modifier: -1, revealAnother: "ifAncientOneInPlay" }).success).toBe(true);
    expect(TokenEffect.safeParse({ modifier: -1, revealAnother: { if: { enemyInPlay: { trait: "Cultist" } } } }).success).toBe(true);
  });
});
