import { describe, expect, it } from "vitest";
import { createCard, moveCard } from "../movement";
import { type GameContext } from "../context";
import { run } from "../steps/dispatch";
import { preyCandidates } from "../rules/enemies";
import { checkEngagement } from "../rules/investigators";
import { gOf, putEnemy, skipMulligans, start } from "../kits/testkit";
import type { Step } from "../world/types";
import { cardRecIn, invStateIn } from "../world/store";
import { ZONE, INV_STATUS } from "../world/constants";
import { STEP } from "../steps/step";

const ROLAND = "01001";
const DAISY = "01002";

/** resolve one step alone (the table's pending choice set aside) */
function exec(game: GameContext, step: Step) {
  game.s.pending = null;
  game.s.queue = [step];
  run(game);
}

describe("Prey - Bearer only (Daisy's basic weaknesses)", () => {
  // Hallway (Roland) next to Attic (Daisy) and Cellar; Daisy's weakness `code` created for her
  const table = (code: string, hunter = false) => {
    const game = gOf(skipMulligans(start("the-gathering", [ROLAND, DAISY], 3)));
    const at: Record<string, string> = {};
    for (const [name, c] of [
      ["hallway", "01112"],
      ["attic", "01113"],
      ["cellar", "01114"],
    ]) {
      at[name] = createCard(game, c, ZONE.Limbo);
      moveCard(game, at[name], ZONE.Location);
      cardRecIn(game.s, at[name]).revealed = true;
    }
    invStateIn(game.s, ROLAND).location = at.hallway;
    invStateIn(game.s, DAISY).location = at.attic;
    if (hunter) {
      // a test-only Hunter copy of the weakness
      const d = game.db.cards[code];
      game.db = {
        ...game.db,
        cards: { ...game.db.cards, [code]: { ...d, keywords: [...d.keywords, "hunter"] } },
      };
    }
    const e = createCard(game, code, ZONE.Limbo, DAISY);
    return { g: game, e, at };
  };

  it("never picks a non-bearer, even when the bearer is not there", () => {
    const { g: game, e } = table("01101");
    expect(preyCandidates(game, e, [ROLAND])).toEqual([]);
    expect(preyCandidates(game, e, [ROLAND, DAISY])).toEqual([DAISY]);
  });

  it("an investigator moving in without the bearer is not engaged; the bearer is", () => {
    const { g: game, e, at } = table("01102");
    moveCard(game, e, ZONE.Enemy, { location: at.cellar });
    invStateIn(game.s, ROLAND).location = at.cellar;
    checkEngagement(game, ROLAND);
    expect(cardRecIn(game.s, e).engagedWith).toBeNull();
    invStateIn(game.s, DAISY).location = at.cellar;
    checkEngagement(game, DAISY);
    expect(cardRecIn(game.s, e).engagedWith).toBe(DAISY);
  });

  it("a readied enemy re-engages its bearer even when another investigator comes first in turn order", () => {
    const { g: game, e, at } = table("01101");
    invStateIn(game.s, ROLAND).location = at.attic;
    moveCard(game, e, ZONE.Enemy, { location: at.attic });
    checkEngagement(game, ROLAND);
    expect(cardRecIn(game.s, e).engagedWith).toBe(DAISY);
  });

  it("spawning where only non-bearers stand leaves it unengaged", () => {
    const { g: game, e, at } = table("01103");
    exec(game, { t: STEP.Spawn, enemy: e, at: at.hallway, inv: null });
    expect(cardRecIn(game.s, e).location).toBe(at.hallway);
    expect(cardRecIn(game.s, e).engagedWith).toBeNull();
  });

  it("a hunter leaves a non-bearer to hunt the bearer and engages her", () => {
    const { g: game, e, at } = table("01101", true);
    moveCard(game, e, ZONE.Enemy, { location: at.hallway });
    exec(game, { t: STEP.HunterMoves });
    expect(cardRecIn(game.s, e).location).toBe(at.attic);
    expect(cardRecIn(game.s, e).engagedWith).toBe(DAISY);
  });

  it("a hunter heads for the bearer, not the nearer non-bearer", () => {
    const { g: game, e, at } = table("01101", true);
    invStateIn(game.s, ROLAND).location = at.cellar;
    moveCard(game, e, ZONE.Enemy, { location: at.cellar });
    invStateIn(game.s, ROLAND).location = at.hallway;
    // Cellar -> Hallway (Roland) -> Attic (Daisy): moves to the Hallway but does not engage Roland
    exec(game, { t: STEP.HunterMoves });
    expect(cardRecIn(game.s, e).location).toBe(at.hallway);
    expect(cardRecIn(game.s, e).engagedWith).toBeNull();
  });

  it("a hunter with no bearer in play does not move", () => {
    const { g: game, e, at } = table("01101", true);
    invStateIn(game.s, DAISY).status = INV_STATUS.Defeated;
    moveCard(game, e, ZONE.Enemy, { location: at.cellar });
    exec(game, { t: STEP.HunterMoves });
    expect(cardRecIn(game.s, e).location).toBe(at.cellar);
    expect(cardRecIn(game.s, e).engagedWith).toBeNull();
  });

  it("an enemy without only-prey still engages whoever is there", () => {
    const { g: game, at } = table("01101");
    const ghoul = putEnemy(game, "01160", at.hallway);
    checkEngagement(game, ROLAND);
    expect(cardRecIn(game.s, ghoul).engagedWith).toBe(ROLAND);
  });
});
