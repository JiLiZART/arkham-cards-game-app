/** The vocabulary Where Doom Awaits added (campaign-the-dunwich-legacy, task 7.1), outside its scenario: one test per entry. */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../../content";
import type { Effect } from "../../../content/schema";
import type { Result } from "../../index";
import { card, currentAct, currentAgenda, inv, setCounter, type GameContext } from "../../context";
import { checkCondition } from "../../queries";
import { amt } from "../targets";
import { game, inject, toTurn } from "../../kits/driver";
import { gOf, mutate } from "../../kits/testkit";
import { STEP } from "../../steps/step";
import { createCard, moveCard } from "../../movement";
import { ZONE } from "../../world/constants";

beforeAll(async () => {
  await loadPack("dwl");
});

const R = "01001";
const start = (prep: (game: GameContext) => void = () => {}) =>
  game({ investigators: [R], bag: ["0"], prep });
const effect = (r: Result, e: Effect, source: string | null = null) =>
  toTurn(
    inject(r, () => {}, { t: STEP.Eff, effect: e, ctx: { you: R, source } }),
    R,
  );
const here = (game: GameContext) => inv(game, R).location!;

describe("Amount and Condition actionsLeft", () => {
  it("n per action left in your turn; none outside it", () => {
    const r = start((g) => setCounter(g, R, "actionsLeft", 2));
    const g = gOf(r);
    expect(amt(g, { actionsLeft: 2 }, { you: R })).toBe(4);
    expect(checkCondition(g, { actionsLeft: { max: 0 } }, { you: R })).toBe(false);
    expect(checkCondition(g, { actionsLeft: { min: 2 } }, { you: R })).toBe(true);
    const mythos = gOf(mutate(r, (x) => void (x.s.phase = "mythos")));
    expect(amt(mythos, { actionsLeft: 2 }, { you: R })).toBe(0);
    expect(checkCondition(mythos, { actionsLeft: { max: 0 } }, { you: R })).toBe(true);
  });
});

describe("Condition agendaStage", () => {
  it("the current agenda's stage", () => {
    const g = gOf(start());
    expect(checkCondition(g, { agendaStage: { min: 1, max: 1 } }, { you: R })).toBe(true);
    expect(checkCondition(g, { agendaStage: { min: 2 } }, { you: R })).toBe(false);
  });
});

describe("removeDoom", () => {
  it("doom off the source, at most what it holds", () => {
    let agenda = "";
    const r = start((g) => {
      agenda = currentAgenda(g)!;
      setCounter(g, agenda, "doom", 1);
    });
    const after = effect(r, { op: "removeDoom", amount: 2, on: "self" }, agenda);
    expect(card(gOf(after), agenda).doom).toBe(0);
  });
});

describe("ModFlag cannotPlaceClues", () => {
  it("no clues go from the bank on a location flagged so (Ascending the Hill as the act: every non-Altered location)", () => {
    const r = start((g) => {
      setCounter(g, here(g), "clues", 0);
      moveCard(g, currentAct(g)!, ZONE.Removed);
      moveCard(g, createCard(g, "02278", ZONE.Limbo), ZONE.Act, { deck: "a" });
    });
    const after = effect(r, { op: "placeTokens", on: "yourLocation", clues: 2 });
    expect(card(gOf(after), here(gOf(after))).clues).toBe(0);
    const free = effect(
      start((g) => setCounter(g, here(g), "clues", 0)),
      {
        op: "placeTokens",
        on: "yourLocation",
        clues: 2,
      },
    );
    expect(card(gOf(free), here(gOf(free))).clues).toBe(2);
  });
});
