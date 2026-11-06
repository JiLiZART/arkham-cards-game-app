/**
 * The player cards of Return to The Path to Carcosa (player-cards-ptc, group 8): one test each, at least. Dianne Devine
 * (52025) and Party Guest (52026) are the Return-to campaign's story assets.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import { card, exhaust, type GameContext, inv, setController, setCounter } from "../context";
import {
  enemyHere,
  game,
  hand,
  inject,
  inPlay,
  investigate,
  lastTest,
  offered,
  options,
  play,
  toTurn,
  until,
  use,
} from "../kits/driver";
import { db, gOf, pick } from "../kits/testkit";
import type { Result } from "../index";
import { createCard, moveCard, putOnTop } from "../movement";
import { controlled, enemies, isHidden, threatArea } from "../queries";
import { STEP } from "../steps/step";
import { xp } from "../world/flags";
import { ZONE } from "../world/constants";

beforeAll(() => Promise.all([loadPack("ptc"), loadPack("return")]));

const R = "01001"; // Roland: willpower 3, intellect 3, combat 4, agility 2; sanity 5
const D = "01002"; // Daisy
const MINION = "01160"; // Ghoul Minion: fight 2, health 2, evade 2
const RAVENOUS = "01161"; // Ravenous Ghoul: fight 3, health 3, evade 3
const AUTOMATIC = "01016"; // .45 Automatic: Firearm, 4 ammo
const FLASHLIGHT = "01087"; // Item asset, cost 2
const GUARD_DOG = "01021"; // Ally asset, cost 3
const FROZEN = "01164"; // Frozen in Fear: a Terror in the threat area

const mine = (r: Result, i: string, code: string) =>
  controlled(gOf(r), i).find((c) => c.code === code);
const zoneOf = (r: Result, id: string) => card(gOf(r), id).zone;
/** a Terror in the investigator's threat area */
const terror = (game: GameContext, who: string) => {
  const id = createCard(game, FROZEN, ZONE.Limbo);
  moveCard(game, id, ZONE.Threat);
  setController(game, id, who);
  return id;
};
/** the investigator draws a new copy of one of their own cards (a weakness resolves its revelation) */
const drawOwn = (r: Result, code: string, who: string) => {
  let id = "";
  r = inject(
    r,
    (g) => {
      id = createCard(g, code, ZONE.Limbo, who);
      putOnTop(g, who, [id]);
    },
    { t: STEP.Draw, inv: who, n: 1 },
  );
  return { r, id };
};

describe(".32 Colt (52001)", () => {
  it("spends ammo to fight with +1 damage; 1 resource returns it to your hand", () => {
    let r = game({
      investigators: [R],
      bag: ["0"],
      prep: (g) => {
        inPlay(g, R, "52001");
        enemyHere(g, R, RAVENOUS);
      },
    });
    r = toTurn(use(r, "52001"), R);
    expect(enemies(gOf(r))[0].damage).toBe(2);
    const colt = mine(r, R, "52001")!;
    expect(colt.uses).toBe(5);
    const res = inv(gOf(r), R).resources;
    r = toTurn(use(r, "52001", 1), R);
    expect(zoneOf(r, colt.id)).toBe(ZONE.Hand);
    expect(inv(gOf(r), R).resources).toBe(res - 1);
  });
});

describe('"Eat lead!" (52002)', () => {
  it("an attack with a Firearm: 1 more ammo spent, 1 more token revealed, one resolved", () => {
    let gun = "";
    let r = game({
      investigators: [R],
      bag: ["-1", "+1"],
      prep: (g) => {
        hand(g, R, "52002");
        gun = inPlay(g, R, AUTOMATIC);
        enemyHere(g, R, RAVENOUS);
      },
    });
    r = until(use(r, AUTOMATIC), offered(/^"Eat lead!"/));
    r = until(pick(r, /^"Eat lead!"/), offered(/^Resolve/));
    expect(options(r).filter((o) => o.startsWith("Resolve"))).toHaveLength(2);
    r = toTurn(pick(r, "Resolve +1"), R);
    expect(card(gOf(r), gun).uses).toBe(2);
    expect(lastTest(r)?.tokens).toEqual(["+1"]);
  });

  it("not with a Firearm out of ammo", () => {
    let r = game({
      investigators: [R],
      bag: ["0"],
      prep: (g) => {
        hand(g, R, "52002");
        const gun = inPlay(g, R, AUTOMATIC);
        setCounter(g, gun, "uses", 1);
        enemyHere(g, R, RAVENOUS);
      },
    });
    r = toTurn(use(r, AUTOMATIC), R);
    expect(r.events.some((e) => /Eat lead/.test(e.text))).toBe(false);
    expect(inv(gOf(r), R).hand.some((h) => card(gOf(r), h).code === "52002")).toBe(true);
  });
});

describe("Logical Reasoning (52003)", () => {
  it("once per clue you have, up to 3: heal 2 horror or discard a Terror", () => {
    let r = game({
      investigators: [R],
      prep: (g) => {
        hand(g, R, "52003");
        setCounter(g, R, "clues", 5);
        setCounter(g, R, "horror", 4);
        terror(g, R);
      },
    });
    r = pick(play(r, "52003"), "Heal 2 horror");
    // the third: with no Terror left, healing is the only choice
    r = toTurn(pick(r, /^Discard a Terror/), R);
    expect(inv(gOf(r), R)).toMatchObject({ horror: 0, clues: 5 });
    expect(threatArea(gOf(r), R)).toEqual([]);
  });
});

describe("Archaic Glyphs (Prophecy Foretold) (52004)", () => {
  it("Researched; a success may put an asset costing up to the margin into play from your hand", () => {
    expect(db.cards["52004"].keywords).toContainEqual({
      researched: { log: "translatedTheGlyphs" },
    });
    let dog = "";
    let r = game({
      investigators: [R],
      bag: ["+1"],
      prep: (g) => {
        inPlay(g, R, "52004");
        hand(g, R, FLASHLIGHT);
        dog = hand(g, R, GUARD_DOG);
      },
    });
    // Roland's 3 intellect +1 against the Study's 2 shroud: 2 over; the Guard Dog costs 3, the Flashlight 2
    r = until(use(r, "52004"), offered("Put none into play"));
    expect(options(r).some((o) => o === "Guard Dog")).toBe(false);
    r = toTurn(pick(r, "Flashlight"), R);
    expect(mine(r, R, FLASHLIGHT)).toBeDefined();
    expect(zoneOf(r, dog)).toBe(ZONE.Hand);
    expect(mine(r, R, "52004")?.uses).toBe(2);
  });
});

describe("Stealth (52005)", () => {
  it("a fast evade during your turn with −2 evade: disengaged, not exhausted", () => {
    let r = game({
      investigators: [R],
      bag: ["-2"],
      prep: (g) => {
        inPlay(g, R, "52005");
        enemyHere(g, R, MINION);
      },
    });
    const actions = inv(gOf(r), R).actionsLeft;
    r = toTurn(use(r, "52005"), R);
    expect(lastTest(r)?.success).toBe(true);
    expect(enemies(gOf(r))[0]).toMatchObject({ exhausted: false, engagedWith: null });
    expect(inv(gOf(r), R).actionsLeft).toBe(actions);
  });
});

describe("Suggestion (52006)", () => {
  it("evade adding your willpower; a charge goes unless it succeeds by 2; with none left it is discarded", () => {
    let ghoul = "";
    let r = game({
      investigators: [R],
      bag: ["-2"],
      prep: (g) => {
        const s = inPlay(g, R, "52006");
        setCounter(g, s, "uses", 1);
        ghoul = enemyHere(g, R, MINION);
      },
    });
    // 2 agility + 3 willpower - 2 against 2: succeeds by 1
    r = toTurn(use(r, "52006"), R);
    expect(card(gOf(r), ghoul)).toMatchObject({ exhausted: true, engagedWith: null });
    expect(mine(r, R, "52006")).toBeUndefined();
  });
});

describe("Alchemical Transmutation (52007)", () => {
  it("willpower (0): 1 resource per point succeeded by, at most 4; a symbol token is 1 damage", () => {
    let r = game({ investigators: [R], bag: ["+1"], prep: (g) => void inPlay(g, R, "52007") });
    const res = inv(gOf(r), R).resources;
    r = toTurn(use(r, "52007"), R);
    expect(inv(gOf(r), R).resources).toBe(res + 4);
    expect(mine(r, R, "52007")?.uses).toBe(3);
    r = game({ investigators: [R], bag: ["skull"], prep: (g) => void inPlay(g, R, "52007") });
    r = toTurn(use(r, "52007"), R);
    expect(inv(gOf(r), R).damage).toBe(1);
  });
});

describe("Storm of Spirits (52008)", () => {
  it("a willpower attack at +2: on a success 3 damage to each enemy here; a symbol token is 2 damage to each investigator here", () => {
    let a = "";
    let b = "";
    let r = game({
      investigators: [R],
      bag: ["-2"],
      prep: (g) => {
        hand(g, R, "52008");
        a = enemyHere(g, R, RAVENOUS);
        b = enemyHere(g, R, RAVENOUS, false);
      },
    });
    // 3 willpower + 2 - 2 against fight 3
    r = toTurn(play(r, "52008"), R);
    expect(lastTest(r)).toMatchObject({ skill: "willpower", success: true });
    expect([card(gOf(r), a).zone, card(gOf(r), b).zone]).toEqual([
      ZONE.EncounterDiscard,
      ZONE.EncounterDiscard,
    ]);
    r = game({
      investigators: [R, D],
      bag: ["skull"],
      prep: (g) => {
        hand(g, R, "52008");
        enemyHere(g, R, MINION);
      },
    });
    r = toTurn(play(r, "52008"), R);
    expect([inv(gOf(r), R).damage, inv(gOf(r), D).damage]).toEqual([2, 2]);
  });
});

describe("Lantern (52009)", () => {
  it("investigates at −1 shroud; discarded for 1 damage, or removed from the game for 2", () => {
    let r = game({
      investigators: [R],
      bag: ["-1"],
      prep: (g) => {
        inPlay(g, R, "52009");
        setCounter(g, inv(g, R).location!, "clues", 2);
      },
    });
    r = toTurn(use(r, "52009"), R);
    expect(lastTest(r)).toMatchObject({ difficulty: 1, success: true });
    let ghoul = "";
    r = inject(r, (g) => void (ghoul = enemyHere(g, R, RAVENOUS)));
    const lantern = mine(r, R, "52009")!.id;
    r = toTurn(pick(use(r, "52009", 1), /^Remove Lantern/), R);
    expect(card(gOf(r), ghoul).damage).toBe(2);
    expect(zoneOf(r, lantern)).toBe(ZONE.Removed);
  });
});

describe("Gravedigger's Shovel (52010)", () => {
  it("fights with +2 combat; discarded for 1 clue, or removed from the game for 2", () => {
    let r = game({
      investigators: [R],
      bag: ["0"],
      prep: (g) => {
        inPlay(g, R, "52010");
        enemyHere(g, R, RAVENOUS);
        setCounter(g, inv(g, R).location!, "clues", 2);
      },
    });
    r = toTurn(use(r, "52010"), R);
    expect(lastTest(r)?.total).toBe(6);
    const shovel = mine(r, R, "52010")!.id;
    r = toTurn(pick(use(r, "52010", 1), "Discover 1 clue"), R);
    expect(inv(gOf(r), R).clues).toBe(1);
    expect(zoneOf(r, shovel)).toBe(ZONE.Discard);
  });
});

describe("Unspeakable Oath (52011–52013)", () => {
  it("drawn: secretly into your hand, held as Hidden (no discard but its own); 2 fewer experience if still there at the end", () => {
    let { r, id } = drawOwn(game({ investigators: [R] }), "52011", R);
    expect(zoneOf(r, id)).toBe(ZONE.Hand);
    expect(isHidden(gOf(r), id)).toBe(true);
    r = inject(r, () => {}, { t: STEP.Resolution, id: "R1" });
    expect(xp.get(gOf(r), R)).toBe(-2);
  });

  it("Bloodthirst: discarded when you deal damage beyond an enemy's remaining health", () => {
    let id = "";
    let r = game({
      investigators: [R],
      bag: ["0"],
      prep: (g) => {
        id = hand(g, R, "52011");
        setController(g, id, R);
        inPlay(g, R, "52001");
        enemyHere(g, R, MINION);
      },
    });
    // the .32 Colt's 2 damage against the Ghoul Minion's 2 health: none in excess
    r = toTurn(use(r, "52001"), R);
    expect(zoneOf(r, id)).toBe(ZONE.Hand);
    r = inject(r, (g) => void setCounter(g, enemyHere(g, R, MINION), "damage", 1));
    r = until(use(r, "52001"), offered(/^Unspeakable Oath/));
    r = toTurn(pick(r, /^Unspeakable Oath/), R);
    expect(zoneOf(r, id)).toBe(ZONE.Discard);
  });

  it("Curiosity: discarded after you successfully investigate a location with no clues", () => {
    let id = "";
    let r = game({
      investigators: [R],
      bag: ["0"],
      prep: (g) => {
        id = hand(g, R, "52012");
        setController(g, id, R);
        setCounter(g, inv(g, R).location!, "clues", 0);
      },
    });
    r = until(investigate(r), offered(/^Unspeakable Oath/));
    r = toTurn(pick(r, /^Unspeakable Oath/), R);
    expect(zoneOf(r, id)).toBe(ZONE.Discard);
  });

  it("Cowardice: an evasion of an exhausted unengaged enemy here discards it", () => {
    let id = "";
    let r = game({
      investigators: [R],
      bag: ["0"],
      prep: (g) => {
        id = hand(g, R, "52013");
        setController(g, id, R);
      },
    });
    expect(options(r).some((o) => o.startsWith("Unspeakable Oath"))).toBe(false);
    r = inject(r, (g) => {
      exhaust(g, enemyHere(g, R, MINION, false));
    });
    r = toTurn(pick(r, /^Unspeakable Oath/), R);
    expect(lastTest(r)).toMatchObject({ skill: "agility", success: true });
    expect(zoneOf(r, id)).toBe(ZONE.Discard);
  });
});
