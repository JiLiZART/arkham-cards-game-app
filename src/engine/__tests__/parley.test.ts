/**
 * Parley with costs and a window (campaign-the-path-to-carcosa, task 1.3): an ability designated `parley` gated by the
 * investigator's resources or hand, costing two actions or cards from hand, with no test; a `parleyed` window after it;
 * Tough Crowd's extra action through `extraActionCost`.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import type { Ability } from "../../content/schema";
import type { Result } from "../index";
import { inv, placeInvestigator, setController, setCounter, type GameContext } from "../context";
import { addLocation, game, hand, toTurn, use, windowOf } from "../kits/driver";
import { db, gOf, options, pick } from "../kits/testkit";
import { createCard, moveCard } from "../movement";
import { ZONE } from "../world/constants";
import type { CardScript } from "../world/types";

const R = "01001";
const JORDAN = "03077";
const ASHLEIGH = "03080";
const BALLROOM = "03071";
const TOUGH_CROWD = "03083";

/** the printed parleys, written here as the scenario's data will write them */
const parley = (condition: Ability["condition"], extra: Partial<Ability> = {}): Ability => ({
  kind: "action",
  designator: "parley",
  usableBy: "atLocation",
  condition,
  effects: [{ op: "gainResources", amount: 1 }],
  ...extra,
});
const saved: Record<string, Ability[]> = {};
const savedScript: { crowd?: CardScript } = {};

beforeAll(async () => {
  await loadPack("ptc");
  for (const code of [JORDAN, ASHLEIGH, BALLROOM]) saved[code] = db.cards[code].abilities;
  // Jordan: "If you have 10 or more resources: Parley." (his test left out: the gate is what is tested)
  db.cards[JORDAN].abilities = [parley({ resources: { min: 10 } })];
  // Ashleigh: "[action][action]: Parley. You listen to Ashleigh perform." No test
  db.cards[ASHLEIGH].abilities = [parley(undefined, { actionCost: 2 })];
  // the Ballroom: "After you perform a parley action in the Ballroom: Gain 2 resources."
  db.cards[BALLROOM].abilities = [
    {
      kind: "reaction",
      trigger: "parleyed",
      limit: { per: "phase", count: 1, group: true },
      effects: [{ op: "gainResources", amount: 2 }],
    },
  ];
  savedScript.crowd = db.scripts[TOUGH_CROWD];
  // Tough Crowd: "Each investigator must spend 1 additional action to parley."
  db.scripts[TOUGH_CROWD] = {
    extraActionCost: (_game, _card, _inv, designator) => (designator === "parley" ? 1 : 0),
  };
});
afterAll(() => {
  for (const [code, abilities] of Object.entries(saved)) db.cards[code].abilities = abilities;
  if (savedScript.crowd) db.scripts[TOUGH_CROWD] = savedScript.crowd;
  else delete db.scripts[TOUGH_CROWD];
});

/** a Bystander at Roland's location, controlled by no one */
function bystander(game: GameContext, code: string) {
  const id = createCard(game, code, ZONE.Limbo);
  moveCard(game, id, ZONE.Attached, { location: inv(game, R).location! });
  setController(game, id, null);
  return id;
}
const emptyHand = (game: GameContext) => {
  for (const h of inv(game, R).hand.slice()) moveCard(game, h, ZONE.Discard);
};
const start = (prep: (game: GameContext) => void) => game({ investigators: [R], bag: ["0"], prep });
const parleys = (r: Result) => options(r).filter((o) => /parley/i.test(o));

describe("gates", () => {
  it("resources at least: Jordan's parley is offered with 10 resources, not 9", () => {
    expect(
      parleys(
        start((g) => {
          bystander(g, JORDAN);
          setCounter(g, R, "resources", 9);
        }),
      ),
    ).toEqual([]);
    const r = start((g) => {
      bystander(g, JORDAN);
      setCounter(g, R, "resources", 10);
    });
    expect(parleys(r).length).toBe(1);
    expect(inv(gOf(use(r, JORDAN)), R).resources).toBe(11);
  });

  it("cards in hand at least: Haruko's gate", () => {
    const harukoGate = { cardsInHand: { min: 6 } } as const;
    db.cards[JORDAN].abilities = [parley(harukoGate)];
    const few = start((g) => {
      bystander(g, JORDAN);
      emptyHand(g);
      for (let k = 0; k < 5; k++) hand(g, R, "01088");
    });
    expect(parleys(few)).toEqual([]);
    const enough = start((g) => {
      bystander(g, JORDAN);
      emptyHand(g);
      for (let k = 0; k < 6; k++) hand(g, R, "01088");
    });
    expect(parleys(enough).length).toBe(1);
    db.cards[JORDAN].abilities = [parley({ resources: { min: 10 } })];
  });
});

describe("costs", () => {
  it("two actions and no test: Ashleigh", () => {
    const r = start((g) => bystander(g, ASHLEIGH));
    expect(parleys(r)).toEqual([expect.stringMatching(/\[2 actions\]$/)]);
    const after = use(r, ASHLEIGH);
    expect(inv(gOf(after), R).actionsLeft).toBe(1);
    expect(after.state.skillTest).toBeFalsy();
    expect(inv(gOf(after), R).resources).toBe(6);
  });

  it("cards discarded from hand: offered only with that many other cards", () => {
    db.cards[JORDAN].abilities = [parley(undefined, { cost: { discardFromHand: 2 } })];
    const one = start((g) => {
      bystander(g, JORDAN);
      emptyHand(g);
      hand(g, R, "01088");
    });
    expect(parleys(one)).toEqual([]);
    const two = start((g) => {
      bystander(g, JORDAN);
      emptyHand(g);
      hand(g, R, "01088");
      hand(g, R, "01088");
    });
    expect(parleys(two).length).toBe(1);
    db.cards[JORDAN].abilities = [parley({ resources: { min: 10 } })];
  });

  it("Tough Crowd: one more action to parley", () => {
    const r = start((g) => {
      bystander(g, ASHLEIGH);
      moveCard(g, createCard(g, TOUGH_CROWD, ZONE.Limbo), ZONE.Play);
    });
    expect(parleys(r)).toEqual([expect.stringMatching(/\[3 actions\]$/)]);
  });
});

describe("the parleyed window", () => {
  it("after a parley in the Ballroom, its reaction is offered", () => {
    let r = start((g) => {
      const room = addLocation(g, BALLROOM, []);
      placeInvestigator(g, R, room);
      bystander(g, ASHLEIGH);
    });
    r = use(r, ASHLEIGH);
    expect(windowOf(r)).toBe("parleyed");
    r = toTurn(pick(r, /Ballroom/), R);
    expect(inv(gOf(r), R).resources).toBe(5 + 1 + 2);
  });
});
