/**
 * Scenario facts (campaign-the-path-to-carcosa, task 1.7): facts the cards say to "remember" and their count (The
 * Unspeakable Oath's four of six), how an act advanced given to its back (A Phantom of Truth's act 1), the agenda deck
 * reset with the doom in play removed (Curtain Call's Encore), and the horror on you as a condition and an amount.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Ability, Effect } from "../../content/schema";
import type { Result } from "../index";
import { card, currentAgenda, inv, setCounter, type GameContext } from "../context";
import { checkCondition, rememberedCount } from "../queries";
import { amt } from "../effects/targets";
import { enemyHere, game, inject, toTurn } from "../kits/driver";
import { db, gOf, mutate, pick } from "../kits/testkit";
import { STEP } from "../steps/step";
import type { CardScript, EffCtx } from "../world/types";

const R = "01001";
const ACT_1 = "01108"; // Trapped
const start = (prep: (game: GameContext) => void = () => {}) =>
  game({ investigators: [R], bag: ["0"], prep });
const run = (r: Result, e: Effect) =>
  toTurn(
    inject(r, () => {}, { t: STEP.Eff, effect: e, ctx: { you: R, source: null } }),
    R,
  );

describe("remembered facts", () => {
  it("remember records a fact; rememberedCount counts the listed ones remembered", () => {
    let r = run(start(), { op: "remember", key: "setAFireInTheKitchen" });
    r = run(r, { op: "remember", key: "distractedTheGuards" });
    r = run(r, { op: "remember", key: "distractedTheGuards" }); // once is enough
    const g = gOf(r);
    const six = [
      "knowTheGuardsPatrols",
      "setAFireInTheKitchen",
      "incitedAFightAmongstThePatients",
      "releasedADangerousPatient",
      "recalledTheWayOut",
      "distractedTheGuards",
    ];
    expect(rememberedCount(g, six)).toBe(2);
    expect(checkCondition(g, { rememberedCount: { of: six, min: 2 } }, { you: R })).toBe(true);
    expect(checkCondition(g, { rememberedCount: { of: six, min: 4 } }, { you: R })).toBe(false);
    expect(checkCondition(g, { rememberedCount: { of: ["foundAGuide"], min: 1 } }, {})).toBe(false);
  });
});

describe("how an act advanced", () => {
  const seen: (string | undefined)[] = [];
  let printed: Ability[] = [];
  beforeAll(() => {
    printed = db.cards[ACT_1].abilities;
    // the act's back, as A Phantom of Truth's act 1 reads it: "If you spent clues to advance: … Otherwise: …"
    db.cards[ACT_1].abilities = [{ kind: "revelation", run: "back" } as Ability];
    db.scripts[ACT_1] = {
      fns: { back: (_game, r) => void seen.push((r.ctx as EffCtx).actAdvancedBy) },
    } satisfies CardScript;
  });
  afterAll(() => {
    db.cards[ACT_1].abilities = printed;
    delete db.scripts[ACT_1];
  });

  it("clues spent to advance it say clues; a script's advance says what it is given", () => {
    let r = start((g) => setCounter(g, R, "clues", 10));
    r = toTurn(pick(r, /^Advance act/), R);
    expect(seen).toEqual(["clues"]);
    toTurn(
      inject(start(), () => {}, { t: STEP.AdvanceAct, by: "doom" }),
      R,
    );
    expect(seen).toEqual(["clues", "doom"]);
  });
});

describe("Encore: the doom in play removed, the agenda deck reset", () => {
  it("removeDoom on all, resetDeck of the agenda, 3 doom placed on agenda 1a", () => {
    let enemy = "";
    let r = start((g) => {
      enemy = enemyHere(g, R, "01160", false);
      setCounter(g, enemy, "doom", 2);
    });
    // to agenda 2
    r = toTurn(
      inject(r, () => {}, { t: STEP.AdvanceAgenda }),
      R,
    );
    const second = currentAgenda(gOf(r))!;
    expect(card(gOf(r), second).code).toBe("01106");
    r = mutate(r, (g) => setCounter(g, second, "doom", 4));
    for (const e of [
      { op: "removeDoom", amount: "all", on: "allInPlay" },
      { op: "resetDeck", kind: "agenda" },
      { op: "placeDoom", amount: 3, on: "agenda" },
    ] as Effect[])
      r = run(r, e);
    const g = gOf(r);
    expect(card(g, currentAgenda(g)!).code).toBe("01105");
    expect(card(g, currentAgenda(g)!).doom).toBe(3);
    expect(card(g, enemy).doom).toBe(0);
  });
});

describe("the horror on you", () => {
  it("as a condition (Descent into Madness: at least 3) and as an amount (X is the horror on you)", () => {
    const g = gOf(start((x) => setCounter(x, R, "horror", 3)));
    expect(checkCondition(g, { horror: { min: 3 } }, { you: R })).toBe(true);
    expect(checkCondition(g, { horror: { min: 4 } }, { you: R })).toBe(false);
    expect(amt(g, { onYou: "horror" }, { you: R })).toBe(3);
    expect(inv(g, R).horror).toBe(3);
  });
});
