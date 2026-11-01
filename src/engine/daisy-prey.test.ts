import { describe, expect, it } from "vitest";
import { createCard, moveCard, type G } from "./core";
import { run } from "./engine";
import { preyCandidates } from "./rules/enemies";
import { checkEngagement } from "./rules/investigators";
import { gOf, putEnemy, skipMulligans, start } from "./testkit";
import type { Step } from "./types";
import { cardRecIn, invStateIn } from "./records";

const ROLAND = "01001";
const DAISY = "01002";

/** resolve one step alone (the table's pending choice set aside) */
function exec(g: G, step: Step) {
  g.s.pending = null;
  g.s.queue = [step];
  run(g);
}

describe("Prey - Bearer only (Daisy's basic weaknesses)", () => {
  // Hallway (Roland) next to Attic (Daisy) and Cellar; Daisy's weakness `code` created for her
  const table = (code: string, hunter = false) => {
    const g = gOf(skipMulligans(start("the-gathering", [ROLAND, DAISY], 3)));
    const at: Record<string, string> = {};
    for (const [name, c] of [
      ["hallway", "01112"],
      ["attic", "01113"],
      ["cellar", "01114"],
    ]) {
      at[name] = createCard(g, c, "limbo");
      moveCard(g, at[name], "location");
      cardRecIn(g.s, at[name]).revealed = true;
    }
    invStateIn(g.s, ROLAND).location = at.hallway;
    invStateIn(g.s, DAISY).location = at.attic;
    if (hunter) {
      // a test-only Hunter copy of the weakness
      const d = g.db.cards[code];
      g.db = {
        ...g.db,
        cards: { ...g.db.cards, [code]: { ...d, keywords: [...d.keywords, "hunter"] } },
      };
    }
    const e = createCard(g, code, "limbo", DAISY);
    return { g, e, at };
  };

  it("never picks a non-bearer, even when the bearer is not there", () => {
    const { g, e } = table("01101");
    expect(preyCandidates(g, e, [ROLAND])).toEqual([]);
    expect(preyCandidates(g, e, [ROLAND, DAISY])).toEqual([DAISY]);
  });

  it("an investigator moving in without the bearer is not engaged; the bearer is", () => {
    const { g, e, at } = table("01102");
    moveCard(g, e, "enemy", { location: at.cellar });
    invStateIn(g.s, ROLAND).location = at.cellar;
    checkEngagement(g, ROLAND);
    expect(cardRecIn(g.s, e).engagedWith).toBeNull();
    invStateIn(g.s, DAISY).location = at.cellar;
    checkEngagement(g, DAISY);
    expect(cardRecIn(g.s, e).engagedWith).toBe(DAISY);
  });

  it("a readied enemy re-engages its bearer even when another investigator comes first in turn order", () => {
    const { g, e, at } = table("01101");
    invStateIn(g.s, ROLAND).location = at.attic;
    moveCard(g, e, "enemy", { location: at.attic });
    checkEngagement(g, ROLAND);
    expect(cardRecIn(g.s, e).engagedWith).toBe(DAISY);
  });

  it("spawning where only non-bearers stand leaves it unengaged", () => {
    const { g, e, at } = table("01103");
    exec(g, { t: "Spawn", enemy: e, at: at.hallway, inv: null });
    expect(cardRecIn(g.s, e).location).toBe(at.hallway);
    expect(cardRecIn(g.s, e).engagedWith).toBeNull();
  });

  it("a hunter leaves a non-bearer to hunt the bearer and engages her", () => {
    const { g, e, at } = table("01101", true);
    moveCard(g, e, "enemy", { location: at.hallway });
    exec(g, { t: "HunterMoves" });
    expect(cardRecIn(g.s, e).location).toBe(at.attic);
    expect(cardRecIn(g.s, e).engagedWith).toBe(DAISY);
  });

  it("a hunter heads for the bearer, not the nearer non-bearer", () => {
    const { g, e, at } = table("01101", true);
    invStateIn(g.s, ROLAND).location = at.cellar;
    moveCard(g, e, "enemy", { location: at.cellar });
    invStateIn(g.s, ROLAND).location = at.hallway;
    // Cellar -> Hallway (Roland) -> Attic (Daisy): moves to the Hallway but does not engage Roland
    exec(g, { t: "HunterMoves" });
    expect(cardRecIn(g.s, e).location).toBe(at.hallway);
    expect(cardRecIn(g.s, e).engagedWith).toBeNull();
  });

  it("a hunter with no bearer in play does not move", () => {
    const { g, e, at } = table("01101", true);
    invStateIn(g.s, DAISY).status = "defeated";
    moveCard(g, e, "enemy", { location: at.cellar });
    exec(g, { t: "HunterMoves" });
    expect(cardRecIn(g.s, e).location).toBe(at.cellar);
    expect(cardRecIn(g.s, e).engagedWith).toBeNull();
  });

  it("an enemy without only-prey still engages whoever is there", () => {
    const { g, at } = table("01101");
    const ghoul = putEnemy(g, "01160", at.hallway);
    checkEngagement(g, ROLAND);
    expect(cardRecIn(g.s, ghoul).engagedWith).toBe(ROLAND);
  });
});
