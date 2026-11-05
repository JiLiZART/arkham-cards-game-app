/** The vocabulary The Essex County Express added (campaign-the-dunwich-legacy, task 4.1): one test per entry. */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../../content";
import type { Effect } from "../../../content/schema";
import type { Result } from "../../index";
import { card, inv, placeInvestigator, reveal, type GameContext } from "../../context";
import { createCard, link, moveCard, setCell } from "../../movement";
import { cellOf } from "../../queries";
import { tokenX } from "../../rules/tokens";
import { game, inject, inPlay, toTurn } from "../../kits/driver";
import { gOf, mutate, options, putEnemy } from "../../kits/testkit";
import { STEP } from "../../steps/step";
import { ZONE } from "../../world/constants";

beforeAll(async () => {
  await loadPack("dwl");
});

const R = "01001"; // Roland: 9 health
const start = (prep: (game: GameContext) => void = () => {}) =>
  game({ investigators: [R], bag: ["0"], prep });

const effect = (r: Result, e: Effect) =>
  inject(r, () => {}, { t: STEP.Eff, effect: e, ctx: { you: R, source: null } });

/** a revealed location of this code in play at a cell, connected to nothing */
function locationAt(game: GameContext, code: string, cell: [number, number]) {
  const id = createCard(game, code, ZONE.Limbo);
  moveCard(game, id, ZONE.Location);
  setCell(game, id, cell);
  reveal(game, id);
  return id;
}

const moves = (r: Result) => options(r).filter((o) => o.startsWith("Move"));
/** a location to move to beside Roland's */
const exit = (game: GameContext) =>
  link(game, inv(game, R).location!, locationAt(game, "02172", [10, 0]));

describe("x: agendaStage", () => {
  it("the current agenda's stage", () => {
    expect(tokenX(gOf(start()), "agendaStage", R)).toBe(1);
  });
});

describe("the flags cannotMoveWhileEngaged and cannotMove", () => {
  it("engaged with Grappling Horror, you are offered no move", () => {
    expect(moves(start(exit)).length).toBeGreaterThan(0);
    const held = start((g) => {
      exit(g);
      putEnemy(g, "02182", inv(g, R).location!, R);
    });
    expect(moves(held)).toEqual([]);
  });

  it("a modifier on you until the end of the round: no move (Claws of Steam)", () => {
    const r = toTurn(
      effect(start(exit), { op: "modify", mod: { flag: "cannotMove" }, until: "round" }),
      R,
    );
    expect(moves(r)).toEqual([]);
  });
});

describe("takeDamage assetsFirst", () => {
  it("the investigator isn't offered the damage while an asset can take it; then they take the rest", () => {
    let ally = "";
    const r = start((g) => {
      ally = inPlay(g, R, "01117"); // Lita Chantler: 3 health
    });
    const asked = effect(r, { op: "takeDamage", amount: 4, assetsFirst: true });
    const labels = options(asked);
    expect(labels.some((l) => l.includes("Lita"))).toBe(true);
    expect(labels.some((l) => l.includes("Roland"))).toBe(false);
    const done = toTurn(asked, R);
    expect(card(gOf(done), ally).zone).not.toBe(ZONE.Play);
    expect(inv(gOf(done), R).damage).toBe(1);
  });
});

describe("spawn toYourRight, entersExhausted", () => {
  it("at the location on the cell to the right of yours, exhausted and engaged with no one; else at yours", () => {
    let right = "";
    const r = start((g) => {
      const here = locationAt(g, "02167", [10, 0]);
      right = locationAt(g, "02168", [11, 0]);
      placeInvestigator(g, R, here);
    });
    const spawn = (r0: Result) => {
      let id = "";
      const made = mutate(r0, (g) => {
        id = createCard(g, "02183", ZONE.Limbo);
      });
      return {
        r: toTurn(
          inject(made, () => {}, { t: STEP.Spawn, enemy: id, inv: R }),
          R,
        ),
        id,
      };
    };
    const a = spawn(r);
    expect(card(gOf(a.r), a.id).location).toBe(right);
    expect(card(gOf(a.r), a.id).exhausted).toBe(true);
    expect(card(gOf(a.r), a.id).engagedWith).toBeNull();
    // nothing to the right: at your location, still exhausted and unengaged
    const atRight = mutate(r, (g) => placeInvestigator(g, R, right));
    const b = spawn(atRight);
    expect(card(gOf(b.r), b.id).location).toBe(right);
    expect(card(gOf(b.r), b.id).engagedWith).toBeNull();
    expect(cellOf(gOf(b.r), right)).toEqual([11, 0]);
  });
});

describe("RemoveLocation outOfGame", () => {
  it("the location leaves the game instead of going to the encounter discard", () => {
    let loc = "";
    const r = start((g) => {
      loc = locationAt(g, "02167", [10, 0]);
    });
    const after = toTurn(
      inject(r, () => {}, { t: STEP.RemoveLocation, location: loc, outOfGame: true }),
      R,
    );
    expect(card(gOf(after), loc).zone).toBe(ZONE.Removed);
    const discarded = toTurn(
      inject(r, () => {}, { t: STEP.RemoveLocation, location: loc }),
      R,
    );
    expect(card(gOf(discarded), loc).zone).toBe(ZONE.EncounterDiscard);
  });
});
