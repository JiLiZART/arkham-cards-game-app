/** The exploration deck's effects (engine-tfa-supplies-vengeance-exploration 1.5; ADR-0052). */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../../content";
import type { Effect } from "../../../content/schema";
import { dispatch, type Result } from "../../index";
import { card, pile } from "../../context";
import { createCard, moveCard } from "../../movement";
import { cardsIn, findByCode } from "../../queries";
import { game, inject, until } from "../../kits/driver";
import { db, gOf, mutate } from "../../kits/testkit";
import { STEP } from "../../steps/step";
import { PILE, ZONE } from "../../world/constants";

beforeAll(async () => {
  await loadPack("tfa");
});

const R = "01001";
const THORNS = "04069"; // location
const CANYON = "04070"; // location
const TRAIL = "04073"; // location
const LOST = "04081"; // treachery

/** a game whose exploration deck is `codes`, top first */
const withDeck = (...codes: string[]) =>
  mutate(game({ investigators: [R] }), (g) => {
    for (const code of codes) moveCard(g, createCard(g, code, ZONE.Limbo), ZONE.Exploration);
  });
const codes = (r: Result) => pile(gOf(r), PILE.Exploration).map((id) => card(gOf(r), id).code);
const run = (r: Result, effect: Effect) =>
  inject(r, () => {}, { t: STEP.Eff, effect, ctx: { you: R } });

describe("lookAtExploration", () => {
  it("discardTreacheries discards the treacheries among the top cards and keeps the rest", () => {
    const r = run(withDeck(THORNS, LOST, CANYON, LOST), {
      op: "lookAtExploration",
      top: 3,
      then: "discardTreacheries",
    });
    expect(codes(r).sort()).toEqual([THORNS, CANYON, LOST].sort());
    expect(pile(gOf(r), PILE.EncounterDiscard).map((id) => card(gOf(r), id).code)).toContain(LOST);
  });

  it("reorder puts the chosen card on the bottom and the others back on top", () => {
    let r = run(withDeck(THORNS, CANYON, TRAIL), {
      op: "lookAtExploration",
      top: 2,
      then: "reorder",
    });
    const canyon = findByCode(gOf(r), CANYON, [ZONE.Exploration])!.id;
    r = dispatch(db, r.state, { type: "choose", inv: R, option: canyon });
    r = until(r, (x) => x.state.pending?.kind === "turn");
    expect(codes(r)).toEqual([THORNS, TRAIL, CANYON]);
  });
});

describe("shuffleIntoExploration", () => {
  it("encounterTop moves the encounter deck's top card into the exploration deck", () => {
    const r0 = withDeck(THORNS);
    const top = pile(gOf(r0), PILE.EncounterDeck)[0];
    const r = run(r0, { op: "shuffleIntoExploration", card: "encounterTop" });
    expect(pile(gOf(r), PILE.Exploration)).toContain(top);
    expect(pile(gOf(r), PILE.EncounterDeck)).not.toContain(top);
  });
});

describe("revealExplorationUntil", () => {
  it("puts the first location into play and leaves the rest in the deck", () => {
    const r = run(withDeck(LOST, CANYON, THORNS), {
      op: "revealExplorationUntil",
      type: "location",
    });
    const canyon = cardsIn(gOf(r), ZONE.Location).find((c) => c.code === CANYON);
    expect(canyon?.revealed).toBe(true);
    expect(codes(r).sort()).toEqual([LOST, THORNS].sort());
  });
});

describe("rebuildExploration", () => {
  it("sets the old deck aside and builds the new one", () => {
    const r = run(
      mutate(withDeck(THORNS, LOST), (g) => {
        createCard(g, TRAIL, ZONE.SetAside);
      }),
      { op: "rebuildExploration", cards: [TRAIL] },
    );
    expect(codes(r)).toEqual([TRAIL]);
    expect(findByCode(gOf(r), THORNS, [ZONE.SetAside])).toBeTruthy();
  });
});
