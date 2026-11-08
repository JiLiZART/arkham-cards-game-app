/** Return to Black Stars Rise (campaign-return-to-the-path-to-carcosa, group 8): setup card 52054 over the base. */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import type { ChaosToken } from "../../content/schema";
import type { Result } from "../index";
import { gOf, options, pick } from "../kits/testkit";
import { game, inject, toTurn, until } from "../kits/driver";
import { connections, findByCode, locations } from "../queries";
import {
  allCards,
  card,
  currentAgenda,
  deckCards,
  inv,
  placeInvestigator,
  reveal,
  setCounter,
  type GameContext,
} from "../context";
import { createCard, moveCard } from "../movement";
import { hideInHand } from "../rules/scenario";
import * as flags from "../world/flags";
import { ZONE } from "../world/constants";
import { STEP } from "../steps/step";
import type { InstId, Step } from "../world/types";

beforeAll(async () => {
  await loadPack("ptc");
  await loadPack("return");
});

const R = "01001"; // Roland: willpower 3, intellect 3, combat 4, agility 2
const ABBEY = "03291";
const ORIGINAL = ["03294", "03295"];
const NEW = ["52055", "52056"];
const CLOISTER = "52055";
const KNIGHTS = "52056";
const GAZE = "52057";
const GRASP = "52058";
const CHAPEL = ["03296", "03297"];
const TOWER = ["03298", "03299"];

interface Opts {
  bag?: ChaosToken[];
  seed?: number;
  prep?: (game: GameContext) => void;
}
const rbsr = ({ bag = ["0"], seed = 1, prep }: Opts = {}) =>
  game({
    scenario: "return-to-black-stars-rise",
    investigators: [R],
    bag,
    seed,
    prep,
    extra: { campaignId: "return-to-the-path-to-carcosa", campaignLog: {} },
  });

const codeOf = (game: GameContext, id: string | null | undefined) =>
  id ? card(game, id).code : null;
const zoneOf = (game: GameContext, code: string) =>
  allCards(game)
    .filter((c) => c.code === code)
    .map((c) => c.zone);
const loc = (game: GameContext, codes: string[]) =>
  locations(game).find((l) => codes.includes(l.code))!.id;
const run = (r: Result, ...steps: Step[]) =>
  toTurn(
    inject(r, () => {}, ...steps),
    R,
  );
const toEnd = (r: Result) => until(r, () => false, 400);
const advanceDeck = (r: Result, deck: "a" | "c") =>
  run(r, deck === "a" ? { t: STEP.AdvanceAgenda } : { t: STEP.AdvanceAgenda, deck });
/** the seed whose pile is the box's (or the original) */
const seedFor = (box: boolean) =>
  [1, 2, 3, 4, 5, 6, 7, 8].find(
    (seed) => (zoneOf(gOf(rbsr({ seed })), CLOISTER)[0] === ZONE.SetAside) === box,
  )!;
/** the Abbey Church revealed: its set-aside locations enter play */
const abbeyRevealed = (r: Result) =>
  run(r, { t: STEP.RevealLocation, location: loc(gOf(r), [ABBEY]), by: R } as Step);
/** a hidden treachery in Roland's hand */
function hidden(game: GameContext, code: string): InstId {
  const id = createCard(game, code, ZONE.SetAside);
  hideInHand(game, id, R);
  return id;
}

describe("setup", () => {
  it("one pile of Cloister and Knight's Hall at random, never mixed; the other leaves the game", () => {
    const piles = new Set<string>();
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const g = gOf(rbsr({ seed }));
      const box = zoneOf(g, CLOISTER)[0] === ZONE.SetAside;
      piles.add(box ? "box" : "original");
      for (const code of box ? NEW : ORIGINAL) expect(zoneOf(g, code)).toEqual([ZONE.SetAside]);
      for (const code of box ? ORIGINAL : NEW) expect(zoneOf(g, code)).toEqual([ZONE.Removed]);
      // the base setup: two agenda decks, no act
      expect(codeOf(g, currentAgenda(g, "a"))).toBe("03275");
      expect(codeOf(g, currentAgenda(g, "c"))).toBe("03278");
    }
    expect(piles).toEqual(new Set(["box", "original"]));
  });

  it("the Abbey Church puts the kept pair into play, linked to it and to each other", () => {
    for (const box of [true, false]) {
      const g = gOf(abbeyRevealed(rbsr({ seed: seedFor(box) })));
      const [cloister, knights] = (box ? NEW : ORIGINAL).map((c) => loc(g, [c]));
      expect(connections(g, cloister).map((l) => codeOf(g, l))).toEqual(
        expect.arrayContaining([ABBEY, codeOf(g, knights)]),
      );
      expect(connections(g, knights).map((l) => codeOf(g, l))).toContain(ABBEY);
      for (const code of box ? ORIGINAL : NEW)
        expect(locations(g).some((l) => l.code === code)).toBe(false);
    }
  });
});

describe("the box's cards", () => {
  const at = (code: string) =>
    rbsr({
      bag: ["+1"],
      seed: seedFor(true),
      prep: (g) => {
        for (const c of allCards(g).filter((x) => x.zone === ZONE.SetAside && x.code === code))
          moveCard(g, c.id, ZONE.Location);
        const here = loc(g, [code]);
        reveal(g, here);
        setCounter(g, here, "clues", 0);
        placeInvestigator(g, R, here);
      },
    });

  it("52055 Cloister: parley, willpower or intellect (4), finds the tower key", () => {
    let r = toTurn(at(CLOISTER), R);
    r = pick(r, /find the tower key/);
    expect(options(r).join()).toMatch(/intellect/i);
    r = pick(r, /intellect/i);
    r = r.state.pending?.kind === "commit" ? pick(r, "done") : r;
    r = toTurn(r, R);
    // Roland's intellect 3 and the +1 token: 4 succeeds
    expect(flags.rememberedFact.get(gOf(r), "foundTheTowerKey")).toBe(true);
    expect(flags.rememberedFact.get(gOf(r), "foundAGuide")).toBeFalsy();
  });

  it("52056 Knight's Hall: combat or agility (3), finds a guide", () => {
    let r = toTurn(at(KNIGHTS), R);
    r = pick(r, /find a guide/);
    r = pick(r, /combat/i);
    r = r.state.pending?.kind === "commit" ? pick(r, "done") : r;
    r = toTurn(r, R);
    expect(flags.rememberedFact.get(gOf(r), "foundAGuide")).toBe(true);
    expect(flags.rememberedFact.get(gOf(r), "foundTheTowerKey")).toBeFalsy();
  });

  it("52057 Hastur's Gaze: doom on the c agenda, 2 horror and discarded; doom on the a agenda does nothing", () => {
    let gaze = "";
    let r = toTurn(rbsr({ prep: (g) => (gaze = hidden(g, GAZE)) }), R);
    r = run(r, { t: STEP.PlaceDoom, card: currentAgenda(gOf(r), "a")!, n: 1 } as Step);
    expect(inv(gOf(r), R).horror).toBe(0);
    expect(card(gOf(r), gaze).zone).toBe(ZONE.Hand);
    r = run(r, { t: STEP.PlaceDoom, card: currentAgenda(gOf(r), "c")!, n: 1 } as Step);
    expect(inv(gOf(r), R).horror).toBe(2);
    expect(card(gOf(r), gaze).zone).toBe(ZONE.EncounterDiscard);
  });

  it("52058 Hastur's Grasp: doom on the a agenda, 2 damage and discarded", () => {
    let grasp = "";
    let r = toTurn(rbsr({ prep: (g) => (grasp = hidden(g, GRASP)) }), R);
    r = run(r, { t: STEP.PlaceDoom, card: currentAgenda(gOf(r), "c")!, n: 1 } as Step);
    expect(inv(gOf(r), R).damage).toBe(0);
    r = run(r, { t: STEP.PlaceDoom, card: currentAgenda(gOf(r), "a")!, n: 1 } as Step);
    expect(inv(gOf(r), R).damage).toBe(2);
    expect(card(gOf(r), grasp).zone).toBe(ZONE.EncounterDiscard);
  });

  it("drawn, Hastur's Gaze goes secretly into the drawer's hand", () => {
    let gaze = "";
    const r = run(
      rbsr({
        prep: (g) => {
          gaze = findByCode(g, GAZE, [ZONE.EncounterDeck])!.id;
          moveCard(g, gaze, ZONE.EncounterDeck, { top: true });
        },
      }),
      { t: STEP.Eff, effect: { op: "drawEncounterCard" }, ctx: { you: R, source: null } } as Step,
    );
    expect(card(gOf(r), gaze).zone).toBe(ZONE.Hand);
    expect(inv(gOf(r), R).hand).toContain(gaze);
  });
});

describe("the resolutions, played", () => {
  /** the seed whose agenda pile is The Flood Below's (or The Vortex Above's) */
  const floodSeed = (flood: boolean) =>
    [1, 2, 3, 4, 5, 6, 7, 8].find(
      (seed) =>
        (codeOf(gOf(rbsr({ seed })), deckCards(gOf(rbsr({ seed })), "agenda", "a")[0]) ===
          "03276b") ===
        flood,
    )!;
  const onPath = (codes: string[]) => (game: GameContext) => {
    const there = loc(game, codes);
    reveal(game, there);
    setCounter(game, there, "clues", 0);
    placeInvestigator(game, R, there);
  };

  it("R1 at the Chapel (The Flood Below's 2a), R2 at the Abbey Tower (The Vortex Above's 2c), R3 by agenda 3a, none", () => {
    let r1 = abbeyRevealed(rbsr({ seed: floodSeed(true) }));
    r1 = advanceDeck(advanceDeck(r1, "a"), "a");
    expect(toEnd(inject(r1, onPath(CHAPEL), { t: STEP.CheckObjectives })).state.resolution).toBe(
      "R1",
    );
    let r2 = abbeyRevealed(rbsr({ seed: floodSeed(false) }));
    r2 = advanceDeck(advanceDeck(r2, "a"), "a");
    r2 = advanceDeck(advanceDeck(r2, "c"), "c");
    expect(toEnd(inject(r2, onPath(TOWER), { t: STEP.CheckObjectives })).state.resolution).toBe(
      "R2",
    );
    let r3 = abbeyRevealed(rbsr({ seed: floodSeed(false) }));
    for (let k = 0; k < 3; k++) r3 = advanceDeck(r3, "a");
    expect(toEnd(r3).state.resolution).toBe("R3");
    const none = toEnd(run(rbsr(), { t: STEP.Defeated, inv: R, by: "damage" } as Step));
    expect(none.state.resolution).toBe("none");
  });
});
