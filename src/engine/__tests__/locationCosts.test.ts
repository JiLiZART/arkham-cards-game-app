/**
 * Costs and limits keyed to a location (campaign-the-path-to-carcosa, task 1.5): a cost modifier on the hands of the
 * investigators there (Lighting Box), a flat clue cost the entering investigator pays alone (Patient Confinement), and
 * a locked unrevealed location an act's "ignore the text on the unrevealed side" opens (the Asylum's Kitchen).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import { implemented } from "../../content/implemented";
import type { Ability } from "../../content/schema";
import type { Result } from "../index";
import { currentAct, inv, placeInvestigator, setCounter, type GameContext } from "../context";
import { playCost } from "../rules/cards";
import { addLocation, game, hand, move, toTurn } from "../kits/driver";
import { db, gOf, locId, options } from "../kits/testkit";
import { createCard, link, moveCard } from "../movement";
import { ZONE } from "../world/constants";
import type { ContentDb } from "../world/types";

const R = "01001";
const STUDY = "01111";
const LIGHTING_BOX = "03053";
const CONFINEMENT = "03178";
const KITCHEN = "03172";
const ACT_2 = "03164";
const saved: Record<string, Ability[]> = {};

beforeAll(async () => {
  await loadPack("ptc");
  for (const code of [LIGHTING_BOX, ACT_2]) saved[code] = db.cards[code].abilities;
  // the unrevealed sides, as the scenario's data will write them
  db.cards[CONFINEMENT].enterClues = 1;
  db.cards[KITCHEN].cannotEnterUnrevealed = true;
  // "While you are in the Lighting Box, increase the resource cost of each card in your hand by 2."
  db.cards[LIGHTING_BOX].abilities = [
    {
      kind: "constant",
      modifiers: [{ stat: "cost", value: 2, scope: "investigatorsAtLocation" }],
    },
  ];
  // "Ignore the text on the unrevealed side of [[Arkham Asylum]] locations."
  db.cards[ACT_2].abilities = [
    {
      kind: "constant",
      modifiers: [
        { flag: "ignoreUnrevealedText", scope: "self", filter: { trait: "Arkham Asylum" } },
      ],
    },
  ];
});
afterAll(() => {
  for (const [code, abilities] of Object.entries(saved)) db.cards[code].abilities = abilities;
  delete db.cards[CONFINEMENT].enterClues;
  delete db.cards[KITCHEN].cannotEnterUnrevealed;
});

const start = (prep: (game: GameContext) => void) => game({ investigators: [R], bag: ["0"], prep });
/** an unrevealed location of this code beside Roland's */
function besideUnrevealed(game: GameContext, code: string) {
  const id = createCard(game, code, ZONE.Limbo);
  moveCard(game, id, ZONE.Location);
  link(game, inv(game, R).location!, id);
  return id;
}
const moves = (r: Result) => options(r).filter((o) => o.startsWith("Move"));

describe("a cost modifier while at a location", () => {
  it("a 2-cost event costs 4 in the Lighting Box and 2 once you leave", () => {
    let hunch = "";
    let r = start((g) => {
      const box = addLocation(g, LIGHTING_BOX, [[STUDY, LIGHTING_BOX]]);
      placeInvestigator(g, R, box);
      hunch = hand(g, R, "01037");
    });
    expect(playCost(gOf(r), R, hunch)).toBe(4);
    r = toTurn(move(r, STUDY), R);
    expect(playCost(gOf(r), R, hunch)).toBe(2);
  });
});

describe("a flat clue cost to enter", () => {
  it("the entering investigator spends 1 clue to enter an unrevealed Patient Confinement; with none they cannot", () => {
    expect(moves(start((g) => besideUnrevealed(g, CONFINEMENT)))).toEqual([]);
    let r = start((g) => {
      besideUnrevealed(g, CONFINEMENT);
      setCounter(g, R, "clues", 1);
    });
    expect(moves(r)).toEqual(["Move to Patient Confinement"]);
    r = move(r, CONFINEMENT);
    expect(inv(gOf(r), R).clues).toBe(0);
    expect(inv(gOf(r), R).location).toBe(locId(gOf(r), CONFINEMENT));
  });

  it("the printed lines are accounted for by the data", () => {
    const only = (backText: string, field: object) =>
      implemented(
        {
          cards: {
            x: { code: "x", type: "location", text: "", backText, abilities: [], ...field },
          },
          scripts: {},
        } as unknown as ContentDb,
        "x",
      );
    const cost = "As an additional cost to enter Patient Confinement, you must spend 1 clue.";
    expect(only(cost, { enterClues: 1 })).toBe(true);
    expect(only(cost, {})).toBe(false);
    const locked = "The door leading into the Kitchen is locked. You cannot enter the Kitchen.";
    expect(only(locked, { cannotEnterUnrevealed: true })).toBe(true);
    expect(only(locked, {})).toBe(false);
  });
});

describe("a locked unrevealed location", () => {
  it("can't be entered until an act ignores the unrevealed side of its trait", () => {
    expect(moves(start((g) => besideUnrevealed(g, KITCHEN)))).toEqual([]);
    const open = start((g) => {
      besideUnrevealed(g, KITCHEN);
      moveCard(g, currentAct(g)!, ZONE.Removed);
      moveCard(g, createCard(g, ACT_2, ZONE.Limbo), ZONE.Act, { deck: "a" });
    });
    expect(moves(open)).toEqual(["Move to Kitchen"]);
  });
});
