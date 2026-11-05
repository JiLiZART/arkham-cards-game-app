/**
 * Clues on enemies and assets (campaign-the-path-to-carcosa, task 1.4): placed from the bank on a card, moved between
 * a location, you and a card, taken control of, turned to doom, and taken by the investigator who defeats the enemy.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import type { Effect } from "../../content/schema";
import type { Result } from "../index";
import { card, inv, setController, setCounter, type GameContext } from "../context";
import { enemyHere, game, inject, toTurn } from "../kits/driver";
import { db, gOf } from "../kits/testkit";
import { createCard, moveCard } from "../movement";
import { STEP } from "../steps/step";
import { ZONE } from "../world/constants";

beforeAll(async () => {
  await loadPack("ptc");
});

const R = "01001";
const start = (prep: (game: GameContext) => void) => game({ investigators: [R], bag: ["0"], prep });
const here = (game: GameContext) => inv(game, R).location!;
const run = (r: Result, e: Effect, ctx: { source?: string; enemy?: string } = {}) =>
  toTurn(
    inject(r, () => {}, {
      t: STEP.Eff,
      effect: e,
      ctx: { you: R, inv: R, source: ctx.source ?? null, enemy: ctx.enemy ?? null },
    }),
    R,
  );
/** a Bystander asset at Roland's location, controlled by no one */
function bystander(game: GameContext) {
  const id = createCard(game, "03079", ZONE.Limbo);
  moveCard(game, id, ZONE.Attached, { location: here(game) });
  setController(game, id, null);
  return id;
}

describe("placing and moving clues", () => {
  it("clues from the bank on a card: placeTokens on self (the Bystanders' setup clues)", () => {
    let b = "";
    const r = run(
      start((g) => {
        b = bystander(g);
      }),
      { op: "placeTokens", on: "self", clues: 2 },
      { source: b },
    );
    expect(card(gOf(r), b).clues).toBe(2);
  });

  it("moveClues from the card's location to it (Fanatic, Seeker of Carcosa)", () => {
    let e = "";
    const r = run(
      start((g) => {
        e = enemyHere(g, R, "01160", false);
        setCounter(g, here(g), "clues", 2);
      }),
      { op: "moveClues", amount: 1, from: "selfLocation", to: "self" },
      { source: e },
    );
    expect(card(gOf(r), e).clues).toBe(1);
    expect(card(gOf(r), here(gOf(r))).clues).toBe(1);
  });

  it("moveClues from you to the card; none when you have none (Agent of the King)", () => {
    let e = "";
    const r = run(
      start((g) => {
        e = enemyHere(g, R, "01160", false);
        setCounter(g, R, "clues", 2);
      }),
      { op: "moveClues", amount: 1, from: "you", to: "self" },
      { source: e },
    );
    expect(card(gOf(r), e).clues).toBe(1);
    expect(inv(gOf(r), R).clues).toBe(1);
  });

  it("moveClues from you to an enemy of a trait you choose (Led Astray: a [[Cultist]] enemy)", () => {
    let cultist = "";
    let r = start((g) => {
      enemyHere(g, R, "01160", false); // a Ghoul, not a Cultist
      cultist = enemyHere(g, R, "01169", false); // Acolyte
      setCounter(g, R, "clues", 1);
    });
    r = run(r, {
      op: "moveClues",
      amount: 1,
      from: "you",
      to: "chooseEnemy",
      filter: { trait: "Cultist" },
    });
    expect(card(gOf(r), cultist).clues).toBe(1);
    expect(inv(gOf(r), R).clues).toBe(0);
  });

  it("moveClues from you to an asset of a trait (Fine Dining: a [[Bystander]] asset)", () => {
    let b = "";
    const r = run(
      start((g) => {
        b = bystander(g);
        setCounter(g, R, "clues", 1);
      }),
      {
        op: "moveClues",
        amount: 1,
        from: "you",
        to: "chooseAsset",
        filter: { trait: "Bystander" },
      },
    );
    expect(card(gOf(r), b).clues).toBe(1);
  });
});

describe("taking control of clues", () => {
  it("takeControlOfClues: 1 of the clues on the card goes to you (a Bystander's parley)", () => {
    let b = "";
    const r = run(
      start((g) => {
        b = bystander(g);
        setCounter(g, b, "clues", 2);
      }),
      { op: "takeControlOfClues", amount: 1 },
      { source: b },
    );
    expect(card(gOf(r), b).clues).toBe(1);
    expect(inv(gOf(r), R).clues).toBe(1);
  });

  it("the investigator who defeats Fanatic takes control of all of its clues", () => {
    const FANATIC = "03098";
    const printed = db.cards[FANATIC].abilities;
    // "Forced - When you defeat Fanatic: Take control of all of its clues.", as its data will write it
    db.cards[FANATIC].abilities = [
      {
        kind: "forced",
        trigger: "enemyDefeatedSelf",
        effects: [{ op: "takeControlOfClues", amount: "all", target: "eventInvestigator" }],
      },
    ];
    let e = "";
    const r = toTurn(
      inject(
        start((g) => {
          e = enemyHere(g, R, FANATIC);
          setCounter(g, e, "clues", 2);
        }),
        () => {},
        { t: STEP.DefeatEnemy, enemy: e, by: R },
      ),
      R,
    );
    db.cards[FANATIC].abilities = printed;
    expect(inv(gOf(r), R).clues).toBe(2);
  });
});

describe("clues to doom", () => {
  it("cluesToDoom on each enemy: its clues become doom (Echoes of the Past's agendas)", () => {
    let a = "";
    let b = "";
    const r = run(
      start((g) => {
        a = enemyHere(g, R, "01160", false);
        b = enemyHere(g, R, "01169", false);
        setCounter(g, a, "clues", 2);
        setCounter(g, b, "doom", 1);
      }),
      { op: "cluesToDoom", on: "eachEnemy" },
    );
    expect(card(gOf(r), a)).toMatchObject({ clues: 0, doom: 2 });
    expect(card(gOf(r), b)).toMatchObject({ clues: 0, doom: 1 });
  });
});
