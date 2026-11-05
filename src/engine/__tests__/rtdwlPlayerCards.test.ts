/**
 * The player cards of Return to The Dunwich Legacy (player-cards-dwl, group 8): one test each, at least. Clarity of Mind
 * (51008) came earlier; Engineer (51031) and Naomi O'Bannion (51052) are the Return-to campaign's story assets.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import { addCounter, card, inv, setCounter } from "../context";
import type { GameContext } from "../context";
import {
  addLocation,
  enemyHere,
  game,
  hand,
  inject,
  inPlay,
  lastTest,
  play,
  toTurn,
  until,
  use,
  windowOf,
} from "../kits/driver";
import { commitDone, gOf, options, pick } from "../kits/testkit";
import { skillValue } from "../queries";
import { createCard, putOnTop } from "../movement";
import { STEP } from "../steps/step";
import { ZONE } from "../world/constants";
import type { Result } from "../index";
import type { Effect } from "../../content/schema";

beforeAll(() => Promise.all([loadPack("dwl"), loadPack("return")]));

const R = "01001"; // Roland: willpower 3, intellect 3, combat 4, agility 2
const D = "01002"; // Daisy
const STUDY = "01111";
const HALLWAY = "01112";
const MINION = "01160"; // Ghoul Minion: fight 2, health 2, damage 1
const RAVENOUS = "01161"; // Ravenous Ghoul: fight 3, health 3
const GUN = "01016"; // .45 Automatic: a one-handed Firearm Weapon, 4 ammo

const cardOf = (r: Result, id: string) => card(gOf(r), id);
const test = (r: Result, e: Effect, you = R) =>
  inject(r, () => {}, { t: STEP.Eff, effect: e, ctx: { you, source: null } });
const rich = (game: GameContext) => void addCounter(game, R, "resources", 10);

describe("Return to The Dunwich Legacy", () => {
  it("Bandolier (2): +1 willpower while Weapons fill 2 or more hand slots", () => {
    const r = game({
      investigators: [R],
      prep: (g) => {
        inPlay(g, R, "51001");
        inPlay(g, R, GUN);
      },
    });
    expect(skillValue(gOf(r), R, "willpower")).toBe(3);
    const two = inject(r, (g) => void inPlay(g, R, GUN));
    expect(skillValue(gOf(two), R, "willpower")).toBe(4);
  });

  it("Blackjack (2): against an enemy engaged with another investigator, +1 damage on a success, none to them on a failure", () => {
    const attack = (token: "0" | "autoFail") => {
      let ghoul = "";
      let r = game({
        investigators: [R, D],
        bag: [token],
        prep: (g) => {
          inPlay(g, R, "51002");
          ghoul = enemyHere(g, D, RAVENOUS);
        },
      });
      r = toTurn(commitDone(use(r, "51002")), R);
      return { r, ghoul };
    };
    const hit = attack("0");
    expect(cardOf(hit.r, hit.ghoul).damage).toBe(2);
    const miss = attack("autoFail");
    expect(inv(gOf(miss.r), D).damage).toBe(0);
  });

  it("Preposterous Sketches (2): only with a clue on your location; draws 3", () => {
    let r = game({
      investigators: [R],
      prep: (g) => {
        hand(g, R, "51003");
        rich(g);
        setCounter(g, inv(g, R).location!, "clues", 1);
      },
    });
    const n = inv(gOf(r), R).deck.length;
    r = toTurn(play(r, "51003"), R);
    expect(inv(gOf(r), R).deck.length).toBe(n - 3);
  });

  it("Strange Solution (Empowering Elixir): an investigator at your location gains 2 resources and draws 1; Researched", () => {
    let r = game({ investigators: [R, D], prep: (g) => void inPlay(g, R, "51004") });
    const before = inv(gOf(r), D).resources;
    const cards = inv(gOf(r), D).hand.length;
    r = toTurn(pick(use(r, "51004"), "Daisy Walker"), R);
    expect(inv(gOf(r), D).resources).toBe(before + 2);
    expect(inv(gOf(r), D).hand.length).toBe(cards + 1);
    expect(gOf(r).db.cards["51004"].keywords).toContainEqual({
      researched: { log: "identifiedTheSolution" },
    });
  });

  it("Contraband (2): 2 ammo and a card, or the ammo doubled", () => {
    const run = (choice: RegExp) => {
      let gun = "";
      let r = game({
        investigators: [R],
        prep: (g) => {
          hand(g, R, "51005");
          rich(g);
          gun = inPlay(g, R, GUN);
        },
      });
      r = toTurn(pick(play(r, "51005"), choice), R);
      return cardOf(r, gun).uses;
    };
    expect(run(/^Place 2 ammo/)).toBe(6);
    expect(run(/^Double/)).toBe(8);
  });

  it("Think on Your Feet (2): as an enemy enters your location, move to a connecting one; it stays, unengaged", () => {
    let ghoul = "";
    let r = game({
      investigators: [R],
      prep: (g) => {
        hand(g, R, "51006");
        addLocation(g, HALLWAY, [[STUDY, HALLWAY]]);
        ghoul = createCard(g, MINION, ZONE.Limbo);
      },
    });
    r = until(
      inject(r, () => {}, { t: STEP.Spawn, enemy: ghoul, inv: R }),
      (x) => windowOf(x) === "enemyEntersLocation",
    );
    r = toTurn(pick(r, /^Think on Your Feet/), R);
    expect(cardOf(r, inv(gOf(r), R).location!).code).toBe(HALLWAY);
    expect(cardOf(r, cardOf(r, ghoul).location!).code).toBe(STUDY);
    expect(cardOf(r, ghoul).engagedWith).toBe(null);
  });

  it("Rite of Seeking (2): investigate with willpower +2, 1 more clue", () => {
    let r = game({
      investigators: [R],
      bag: ["0"],
      prep: (g) => {
        inPlay(g, R, "51007");
        setCounter(g, inv(g, R).location!, "clues", 3);
      },
    });
    r = toTurn(commitDone(use(r, "51007")), R);
    expect(lastTest(r)?.base).toBe(5);
    expect(inv(gOf(r), R).clues).toBe(2);
  });

  it("Oops! (2): a failed attack by 3 or less hits another enemy; the investigator the attacked one is engaged with takes none", () => {
    let other = "";
    let r = game({
      investigators: [R, D],
      bag: ["-2"],
      prep: (g) => {
        hand(g, R, "51009");
        rich(g);
        enemyHere(g, D, RAVENOUS); // fight 3: 4 - 2 fails by 1
        other = enemyHere(g, R, MINION, false);
      },
    });
    r = test(r, { op: "fight", target: "chooseAtLocation" });
    r = pick(r, "Ravenous Ghoul");
    r = until(commitDone(r), (x) => options(x).some((o) => o.startsWith("Oops!")));
    r = toTurn(pick(r, /^Oops!/), R);
    expect(cardOf(r, other).damage).toBe(1);
    expect(inv(gOf(r), D).damage).toBe(0);
  });

  it("Rise to the Occasion (3): +1 wild per point the difficulty is over your base skill, at most 3; only then", () => {
    const offer = (difficulty: number) => {
      const r = game({ investigators: [R], prep: (g) => void hand(g, R, "51010") });
      return options(test(r, { op: "skillTest", skill: "willpower", difficulty }));
    };
    expect(offer(3).some((o) => o.startsWith("Commit Rise to the Occasion"))).toBe(false);
    expect(offer(5)).toContain("Commit Rise to the Occasion (+4)"); // 2 printed, +2
    expect(offer(9)).toContain("Commit Rise to the Occasion (+5)"); // at most +3
  });

  it("Through the Gates: the top card of your deck leaves the game with every other copy you own", () => {
    let top = "";
    let copy = "";
    let gates = "";
    let r = game({
      investigators: [R],
      prep: (g) => {
        top = createCard(g, "01088", ZONE.Limbo, R); // Emergency Cache
        putOnTop(g, R, [top]);
        copy = hand(g, R, "01088");
        gates = createCard(g, "51011", ZONE.Limbo, R);
      },
    });
    r = toTurn(
      inject(r, () => {}, { t: STEP.Revelation, inv: R, card: gates }),
      R,
    );
    expect(cardOf(r, top).zone).toBe(ZONE.Removed);
    expect(cardOf(r, copy).zone).toBe(ZONE.Removed);
  });
});
