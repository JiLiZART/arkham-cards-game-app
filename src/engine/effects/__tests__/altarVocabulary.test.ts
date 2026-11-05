/** The vocabulary Blood on the Altar added (campaign-the-dunwich-legacy, task 5.1), outside its scenario: one test per entry. */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../../content";
import type { Effect } from "../../../content/schema";
import type { Result } from "../../index";
import { card, inv, reveal, setCounter, type GameContext } from "../../context";
import { createCard, moveCard } from "../../movement";
import {
  addTempMod,
  checkCondition,
  enemiesAt,
  enemyStat,
  findByCode,
  locations,
} from "../../queries";
import { game, hand, inject, investigate, play, toTurn } from "../../kits/driver";
import { gOf, mutate, putEnemy } from "../../kits/testkit";
import { STEP } from "../../steps/step";
import { ZONE } from "../../world/constants";

beforeAll(async () => {
  await loadPack("dwl");
});

const R = "01001";
const D = "01002";
const start = (prep: (game: GameContext) => void = () => {}, invs = [R]) =>
  game({ investigators: invs, bag: ["+1"], prep });
const effect = (r: Result, e: Effect) =>
  toTurn(
    inject(r, () => {}, { t: STEP.Eff, effect: e, ctx: { you: R, source: null } }),
    R,
  );
const here = (r: Result) => inv(gOf(r), R).location!;
/** the Hallway put into play, revealed, beside the Study */
function hallway(game: GameContext) {
  const id = createCard(game, "01112", ZONE.Limbo);
  moveCard(game, id, ZONE.Location);
  reveal(game, id);
  return id;
}

describe("conditions players and yourLocationIs", () => {
  it("the investigators in the game, and your location by a filter", () => {
    const g = gOf(start(() => {}, [R, D]));
    expect(checkCondition(g, { players: { min: 2 } }, { you: R })).toBe(true);
    expect(checkCondition(g, { players: { min: 3 } }, { you: R })).toBe(false);
    expect(checkCondition(g, { yourLocationIs: { code: "01111" } }, { you: R })).toBe(true);
    expect(checkCondition(g, { yourLocationIs: { code: "02214" } }, { you: R })).toBe(false);
  });
});

describe("placeTokens: clues from the bank on your location, by an Amount", () => {
  it("1, or 2 with the condition", () => {
    const e: Effect = {
      op: "placeTokens",
      on: "yourLocation",
      clues: { base: 1, plus: 1, if: { players: { min: 2 } } },
    };
    const one = start();
    const before = card(gOf(one), here(one)).clues;
    expect(card(gOf(effect(one, e)), here(one)).clues).toBe(before + 1);
    const two = start(() => {}, [R, D]);
    expect(card(gOf(effect(two, e)), here(two)).clues).toBe(card(gOf(two), here(two)).clues + 2);
  });
});

describe("discoverClues at any location", () => {
  it("a clue from a location elsewhere", () => {
    const r = start((g) => {
      setCounter(g, inv(g, R).location!, "clues", 0);
      setCounter(g, hallway(g), "clues", 2);
    });
    const after = effect(r, { op: "discoverClues", amount: 1, at: "anyLocation" });
    expect(inv(gOf(after), R).clues).toBe(1);
  });
});

describe("searchEncounterDraw with a spawn location", () => {
  it("the enemy found spawns there, not at the drawer's location", () => {
    const r = start((g) => void hallway(g));
    const after = effect(r, {
      op: "searchEncounterDraw",
      filter: { type: "enemy", trait: "Ghoul" },
      zones: ["deck"],
      at: "Hallway",
    });
    const g = gOf(after);
    const there = locations(g).find((l) => g.db.cards[l.code].name === "Hallway")!;
    expect(enemiesAt(g, there.id)).toHaveLength(1);
    expect(enemiesAt(g, here(after))).toHaveLength(0);
  });
});

describe("the flags cannotPlayEvents and cluesOnlyByInvestigating", () => {
  it("no event may be played; an asset may", () => {
    const r = start((g) => {
      hand(g, R, "01024");
      hand(g, R, "01021");
      addTempMod(g, { flag: "cannotPlayEvents" }, R, "round");
    });
    expect(() => play(r, "01024")).toThrow(/not offered/);
    expect(() => play(r, "01021")).not.toThrow();
  });

  it("on a location: clues are discovered there by investigating, never by an effect", () => {
    const r = start((g) => {
      setCounter(g, inv(g, R).location!, "clues", 2);
      addTempMod(g, { flag: "cluesOnlyByInvestigating" }, inv(g, R).location!, "round");
    });
    expect(inv(gOf(effect(r, { op: "discoverClues", amount: 1 })), R).clues).toBe(0);
    expect(inv(gOf(toTurn(investigate(r), R)), R).clues).toBe(1);
  });
});

describe("the modifier scope enemiesAtLocation", () => {
  it("each enemy at the source location gets it, no other", () => {
    const r = mutate(start(), (g) => {
      const at = createCard(g, "02204", ZONE.Limbo);
      moveCard(g, at, ZONE.Location);
      reveal(g, at);
      putEnemy(g, "01160", at, null);
      putEnemy(g, "01161", inv(g, R).location!, null);
    });
    const g = gOf(r);
    expect(enemyStat(g, findByCode(g, "01160", [ZONE.Enemy])!.id, "evade")).toBe(
      g.db.cards["01160"].enemy!.evade! + 1,
    );
    expect(enemyStat(g, findByCode(g, "01161", [ZONE.Enemy])!.id, "evade")).toBe(
      g.db.cards["01161"].enemy!.evade!,
    );
  });
});
