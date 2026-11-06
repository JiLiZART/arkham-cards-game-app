/**
 * The player cards of Echoes of the Past, The Unspeakable Oath and A Phantom of Truth (player-cards-ptc, groups 2–4):
 * one test each, at least.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import { card, inv, setController, setCounter } from "../context";
import {
  addLocation,
  enemyHere,
  evade,
  fight,
  game,
  hand,
  inject,
  inPlay,
  lastTest,
  move,
  offered,
  options,
  toTurn,
  until,
  use,
} from "../kits/driver";
import { db, gOf, pick } from "../kits/testkit";
import type { Result } from "../index";
import { createCard, moveCard } from "../movement";
import { controlled, enemyStat, skillValue, threatArea } from "../queries";
import { STEP } from "../steps/step";
import { ZONE } from "../world/constants";
import type { Effect } from "../../content/schema";

beforeAll(() => loadPack("ptc"));

const R = "01001"; // Roland: willpower 3, intellect 3, combat 4, agility 2; sanity 5
const D = "01002"; // Daisy
const MINION = "01160"; // Ghoul Minion: fight 2, health 2, evade 2, 1 damage 1 horror
const RAVENOUS = "01161"; // Ravenous Ghoul: fight 3, health 3, evade 3
const GOAT = "01180"; // Goat Spawn: fight 3, health 3, evade 2; Retaliate
const SHRIVELLING = "01060"; // Spell, 4 charges
const FLASHLIGHT = "01087"; // Item, cost 2
const GUARD_DOG = "01021"; // Ally, cost 3
const BEAT_COP = "01018"; // Ally, cost 4
const STUDY = "01111";
const HALLWAY = "01112";
const GRASPING = "01162"; // Grasping Hands: a non-weakness treachery
const FROZEN = "01164"; // Frozen in Fear: a Terror in the threat area

const eff = (r: Result, you: string, e: Effect, ctx: Record<string, unknown> = {}) =>
  inject(r, () => {}, { t: STEP.Eff, effect: e, ctx: { you, source: null, ...ctx } });
const test = (r: Result, you: string, skill: "willpower" | "intellect" | "combat", n = 1) =>
  eff(r, you, { op: "skillTest", skill, difficulty: n });
const horror = (r: Result, who: string, n: number, direct = false) =>
  inject(r, () => {}, {
    t: STEP.AssignDamage,
    inv: who,
    damage: 0,
    horror: n,
    direct,
    source: null,
  });
const mine = (r: Result, i: string, code: string) =>
  controlled(gOf(r), i).find((c) => c.code === code);
const zoneOf = (r: Result, id: string) => card(gOf(r), id).zone;
/** an investigator draws a new copy of an encounter card */
const drawNew = (r: Result, code: string, who: string) => {
  let id = "";
  r = inject(r, (g) => void (id = createCard(g, code, ZONE.Limbo)));
  return { r: inject(r, () => {}, { t: STEP.DrawEncounter, inv: who, card: id }), id };
};
/** a new enemy spawns at the investigator's location */
const spawnHere = (r: Result, who: string, code: string) => {
  let id = "";
  r = inject(r, (g) => void (id = createCard(g, code, ZONE.Limbo)));
  return {
    r: inject(r, () => {}, { t: STEP.Spawn, enemy: id, inv: who, at: inv(gOf(r), who).location }),
    id,
  };
};

// ---------- Echoes of the Past ----------
describe("the Composure assets (03107, 03109, 03111, 03113, 03115)", () => {
  it("non-direct horror goes to Moxie before Roland; direct horror doesn't", () => {
    let moxie = "";
    let r = game({ investigators: [R], prep: (g) => void (moxie = inPlay(g, R, "03111")) });
    r = horror(r, R, 1);
    expect(options(r)).toEqual(["Assign 1 horror to Moxie (defeated)"]);
    r = toTurn(pick(r, /Moxie/), R);
    expect(zoneOf(r, moxie)).toBe(ZONE.Discard);
    expect(inv(gOf(r), R).horror).toBe(0);
    r = toTurn(horror(r, R, 1, true), R);
    expect(inv(gOf(r), R).horror).toBe(1);
  });

  it("limit 1 Composure in play: Plucky can't be played beside Moxie", () => {
    let r = game({
      investigators: [R],
      prep: (g) => {
        inPlay(g, R, "03111");
        hand(g, R, "03115");
        hand(g, R, "03107");
      },
    });
    expect(options(r).some((o) => /Plucky|Combat Training/.test(o))).toBe(false);
  });

  it("spend 1 resource: +1 to a skill for the test (Combat Training)", () => {
    let r = game({ investigators: [R], bag: ["0"], prep: (g) => void inPlay(g, R, "03107") });
    const res = inv(gOf(r), R).resources;
    r = until(test(r, R, "combat"), offered(/^Combat Training: \+1 combat/));
    r = toTurn(pick(r, /^Combat Training: \+1 combat/), R);
    expect(lastTest(r)?.total).toBe(5);
    expect(inv(gOf(r), R).resources).toBe(res - 1);
  });

  it("Grounded: +1 skill value only during a test on a Spell", () => {
    let spell = "";
    let r = game({
      investigators: [R],
      bag: ["0"],
      prep: (g) => {
        inPlay(g, R, "03113");
        spell = inPlay(g, R, SHRIVELLING);
      },
    });
    const plain = until(test(r, R, "willpower"), (x) => x.state.pending?.kind === "commit");
    expect(options(plain).some((o) => o.startsWith("Grounded"))).toBe(false);
    r = until(
      eff(r, R, { op: "skillTest", skill: "willpower", difficulty: 1 }, { source: spell }),
      offered(/^Grounded/),
    );
    r = toTurn(pick(r, /^Grounded/), R);
    expect(lastTest(r)?.total).toBe(4);
  });
});

describe("Heroic Rescue (03106)", () => {
  it("takes another investigator's attack: you engage the enemy, take it, and deal it 1 damage", () => {
    let ghoul = "";
    let r = game({
      investigators: [R, D],
      prep: (g) => {
        hand(g, R, "03106");
        ghoul = enemyHere(g, D, RAVENOUS);
      },
    });
    r = inject(r, () => {}, {
      t: STEP.EnemyAttack,
      enemy: ghoul,
      inv: D,
      aoo: false,
      key: "atk-t",
    });
    r = until(r, offered(/^Heroic Rescue/));
    r = until(pick(r, /^Heroic Rescue/), (x) => x.state.pending?.kind === "turn");
    const g = gOf(r);
    expect(inv(g, D).damage + inv(g, D).horror).toBe(0);
    expect(inv(g, R).damage + inv(g, R).horror).toBe(2);
    expect(card(g, ghoul)).toMatchObject({ engagedWith: R, damage: 1 });
  });
});

describe("Anatomical Diagrams (03108)", () => {
  it("with 5+ remaining sanity: a non-Elite enemy here gets -2 fight and -2 evade until the turn's end", () => {
    let ghoul = "";
    let r = game({
      investigators: [R],
      prep: (g) => {
        hand(g, R, "03108");
        ghoul = enemyHere(g, R, RAVENOUS);
      },
    });
    r = pick(r, /^Play Anatomical Diagrams/);
    r = toTurn(r, R);
    expect(enemyStat(gOf(r), ghoul, "fight")).toBe(1);
    expect(enemyStat(gOf(r), ghoul, "evade")).toBe(1);
    r = pick(r, "End turn");
    expect(enemyStat(gOf(r), ghoul, "fight")).toBe(3);
  });

  it("not with 4 or less remaining sanity", () => {
    const r = game({
      investigators: [R],
      prep: (g) => {
        hand(g, R, "03108");
        enemyHere(g, R, RAVENOUS);
        setCounter(g, R, "horror", 1);
      },
    });
    expect(options(r).some((o) => /Anatomical/.test(o))).toBe(false);
  });
});

describe("Knuckleduster (03110)", () => {
  it("+1 damage; the attacked enemy gains retaliate for the attack", () => {
    let ghoul = "";
    let r = game({
      investigators: [R],
      bag: ["autoFail"],
      prep: (g) => {
        inPlay(g, R, "03110");
        ghoul = enemyHere(g, R, MINION, false);
      },
    });
    r = toTurn(use(r, "03110"), R);
    expect(inv(gOf(r), R).damage + inv(gOf(r), R).horror).toBeGreaterThan(0);
    r = game({
      investigators: [R],
      bag: ["0"],
      prep: (g) => {
        inPlay(g, R, "03110");
        ghoul = enemyHere(g, R, MINION, false);
      },
    });
    r = toTurn(use(r, "03110"), R);
    expect(zoneOf(r, ghoul)).not.toBe(ZONE.Enemy);
  });
});

describe("David Renfield (03112)", () => {
  it("may place 1 doom on him, then gains a resource per doom; +1 willpower while he has doom", () => {
    let r = game({ investigators: [R], prep: (g) => void inPlay(g, R, "03112") });
    const res = inv(gOf(r), R).resources;
    r = pick(r, /^David Renfield/);
    r = toTurn(pick(r, /^Place 1 doom/), R);
    expect(inv(gOf(r), R).resources).toBe(res + 1);
    expect(mine(r, R, "03112")?.doom).toBe(1);
    expect(skillValue(gOf(r), R, "willpower")).toBe(4);
  });
});

describe("the Desperate skills (03116–03119)", () => {
  it("committed only with 3 or less remaining sanity, 1 per test", () => {
    /** the commit window of a willpower test, two copies in hand and `n` horror on Roland */
    const commitWindow = (n: number) =>
      until(
        test(
          game({
            investigators: [R],
            prep: (g) => {
              hand(g, R, "03116");
              hand(g, R, "03116");
              setCounter(g, R, "horror", n);
            },
          }),
          R,
          "willpower",
          9,
        ),
        (x) => x.state.pending?.kind === "commit",
      );
    let r = commitWindow(1);
    expect(options(r).some((o) => o.startsWith("Commit Say Your Prayers"))).toBe(false);
    r = commitWindow(2);
    r = pick(r, /^Commit Say Your Prayers/);
    expect(options(r).some((o) => o.startsWith("Commit Say Your Prayers"))).toBe(false);
  });
});

// ---------- The Unspeakable Oath ----------
describe("Trench Knife (03147)", () => {
  it("+1 combat per enemy engaged with you; engaging provokes no attack of opportunity", () => {
    let r = game({
      investigators: [R],
      bag: ["0"],
      prep: (g) => {
        inPlay(g, R, "03147");
        enemyHere(g, R, RAVENOUS);
        enemyHere(g, R, RAVENOUS);
        enemyHere(g, R, MINION, false);
      },
    });
    r = toTurn(pick(r, /^Engage Ghoul Minion/), R);
    expect(inv(gOf(r), R).damage + inv(gOf(r), R).horror).toBe(0);
    r = toTurn(pick(use(r, "03147", 1), /Ravenous Ghoul/), R);
    expect(lastTest(r)?.total).toBe(4 + 3);
  });
});

describe("Ambush (03148)", () => {
  it("attached to your location: an enemy spawning there takes 2 damage, and Ambush is discarded", () => {
    let amb = "";
    let r = game({ investigators: [R], prep: (g) => void (amb = hand(g, R, "03148")) });
    r = toTurn(pick(r, /^Play Ambush/), R);
    expect(zoneOf(r, amb)).toBe(ZONE.Attached);
    const s = spawnHere(r, R, RAVENOUS);
    r = toTurn(s.r, R);
    expect(card(gOf(r), s.id).damage).toBe(2);
    expect(zoneOf(r, amb)).toBe(ZONE.Discard);
  });

  it("discarded when no investigator is left at its location", () => {
    let amb = "";
    let r = game({
      investigators: [R],
      prep: (g) => {
        amb = hand(g, R, "03148");
        addLocation(g, HALLWAY, [[STUDY, HALLWAY]]);
      },
    });
    r = toTurn(pick(r, /^Play Ambush/), R);
    r = toTurn(move(r, HALLWAY), R);
    expect(zoneOf(r, amb)).toBe(ZONE.Discard);
  });
});

describe("Charles Ross, Esq. (03149)", () => {
  it("his controller may pay for an Item asset another investigator here plays", () => {
    let r = game({
      investigators: [D, R],
      prep: (g) => {
        inPlay(g, R, "03149");
        hand(g, D, FLASHLIGHT);
        setCounter(g, D, "resources", 1);
        setCounter(g, R, "resources", 5);
      },
    });
    r = pick(r, /^Play Flashlight/);
    expect(r.state.pending?.inv).toBe(R);
    r = toTurn(pick(r, "Spend 2"), D);
    expect(mine(r, D, FLASHLIGHT)).toBeDefined();
    expect(inv(gOf(r), D).resources).toBe(1);
    expect(inv(gOf(r), R).resources).toBe(3);
  });

  it("exhausted: the next Item asset the chosen investigator here plays costs 1 less", () => {
    let r = game({
      investigators: [R],
      prep: (g) => {
        inPlay(g, R, "03149");
        hand(g, R, FLASHLIGHT);
        setCounter(g, R, "resources", 2);
      },
    });
    r = toTurn(pick(r, /^Charles Ross/), R);
    r = toTurn(pick(r, /^Play Flashlight/), R);
    expect(inv(gOf(r), R).resources).toBe(1);
  });
});

describe("Forewarned (03150)", () => {
  it("a clue of yours on your location cancels a treachery's revelation", () => {
    let r = game({
      investigators: [R],
      prep: (g) => {
        hand(g, R, "03150");
        setCounter(g, R, "clues", 1);
      },
    });
    const loc = inv(gOf(r), R).location!;
    const before = card(gOf(r), loc).clues;
    const d = drawNew(r, GRASPING, R);
    r = until(d.r, offered(/^Forewarned/));
    r = toTurn(pick(r, /^Forewarned/), R);
    expect(inv(gOf(r), R).clues).toBe(0);
    expect(card(gOf(r), loc).clues).toBe(before + 1);
    expect(lastTest(r)).toBeNull();
  });
});

describe("Dario El-Amin (03151)", () => {
  it("+1 willpower and intellect with 10+ resources; with no enemy here, exhaust: gain 2", () => {
    let r = game({
      investigators: [R],
      prep: (g) => {
        inPlay(g, R, "03151");
        setCounter(g, R, "resources", 9);
      },
    });
    expect(skillValue(gOf(r), R, "intellect")).toBe(3);
    r = toTurn(use(r, "03151", 1), R);
    expect(inv(gOf(r), R).resources).toBe(11);
    expect(skillValue(gOf(r), R, "intellect")).toBe(4);
    expect(skillValue(gOf(r), R, "willpower")).toBe(4);
  });
});

describe("Sneak Attack (03152)", () => {
  it("2 damage to an enemy at your location not engaged with you", () => {
    let ghoul = "";
    let r = game({
      investigators: [R],
      prep: (g) => {
        hand(g, R, "03152");
        enemyHere(g, R, MINION);
        ghoul = enemyHere(g, R, RAVENOUS, false);
      },
    });
    r = toTurn(pick(r, /^Play Sneak Attack/), R);
    expect(card(gOf(r), ghoul).damage).toBe(2);
  });
});

describe("Storm of Spirits (03153)", () => {
  it("a willpower attack: on a success 2 damage to each enemy here; a symbol token hurts each investigator here", () => {
    let a = "";
    let b = "";
    let r = game({
      investigators: [R],
      bag: ["0"],
      prep: (g) => {
        hand(g, R, "03153");
        a = enemyHere(g, R, RAVENOUS);
        b = enemyHere(g, R, RAVENOUS, false);
      },
    });
    r = toTurn(pick(r, /^Play Storm of Spirits/), R);
    expect(lastTest(r)?.skill).toBe("willpower");
    expect([card(gOf(r), a).damage, card(gOf(r), b).damage]).toEqual([2, 2]);
    r = game({
      investigators: [R],
      bag: ["skull"],
      prep: (g) => {
        hand(g, R, "03153");
        enemyHere(g, R, MINION);
      },
    });
    r = toTurn(pick(r, /^Play Storm of Spirits/), R);
    expect(inv(gOf(r), R).damage).toBe(1);
  });
});

describe("Book of Shadows (03154)", () => {
  it("exhaust and spend 1 resource: 1 charge on a Spell asset you control", () => {
    let r = game({
      investigators: [R],
      prep: (g) => {
        inPlay(g, R, "03154");
        inPlay(g, R, SHRIVELLING);
      },
    });
    const res = inv(gOf(r), R).resources;
    r = toTurn(use(r, "03154"), R);
    expect(mine(r, R, SHRIVELLING)?.uses).toBe(5);
    expect(inv(gOf(r), R).resources).toBe(res - 1);
  });
});

describe("Fight or Flight (03155)", () => {
  it("+X combat and agility until the round's end, X the horror on you", () => {
    let r = game({
      investigators: [R],
      prep: (g) => {
        hand(g, R, "03155");
        setCounter(g, R, "horror", 2);
      },
    });
    r = toTurn(pick(r, /^Play Fight or Flight/), R);
    expect(skillValue(gOf(r), R, "combat")).toBe(6);
    expect(skillValue(gOf(r), R, "agility")).toBe(4);
  });
});

describe("A Test of Will (03156)", () => {
  it("cancels a treachery an investigator at your location draws, and is exiled", () => {
    let will = "";
    let r = game({ investigators: [R, D], prep: (g) => void (will = hand(g, R, "03156")) });
    r = until(drawNew(r, GRASPING, D).r, offered(/A Test of Will/));
    r = toTurn(pick(r, /A Test of Will/), R);
    expect(lastTest(r)).toBeNull();
    expect(zoneOf(r, will)).toBe(ZONE.Removed);
  });
});

describe("Devil's Luck (03157)", () => {
  it("cancels up to 10 damage and horror dealt to you, and is exiled", () => {
    let luck = "";
    let r = game({ investigators: [R], prep: (g) => void (luck = hand(g, R, "03157")) });
    r = inject(r, () => {}, {
      t: STEP.AssignDamage,
      inv: R,
      damage: 3,
      horror: 2,
      direct: true,
      source: null,
    });
    r = until(r, offered(/Devil's Luck/));
    r = toTurn(pick(r, /Devil's Luck/), R);
    expect(inv(gOf(r), R).damage + inv(gOf(r), R).horror).toBe(0);
    expect(zoneOf(r, luck)).toBe(ZONE.Removed);
  });
});

describe("Calling in Favors (03158)", () => {
  it("an Ally back to hand; an Ally from the top 9 played for its cost less the returned one's", () => {
    let dog = "";
    let cop = "";
    let r = game({
      investigators: [R],
      prep: (g) => {
        hand(g, R, "03158");
        dog = inPlay(g, R, GUARD_DOG);
        cop = createCard(g, BEAT_COP, ZONE.Limbo, R);
        moveCard(g, cop, ZONE.Deck, { inv: R, top: true });
        setCounter(g, R, "resources", 2);
      },
    });
    r = pick(r, /^Play Calling in Favors/);
    r = toTurn(pick(r, "Beat Cop"), R);
    expect(zoneOf(r, dog)).toBe(ZONE.Hand);
    expect(zoneOf(r, cop)).toBe(ZONE.Play);
    expect(inv(gOf(r), R).resources).toBe(0);
  });
});

// ---------- A Phantom of Truth ----------
describe('"I\'ll see you in hell!" (03189)', () => {
  it("each non-Elite enemy engaged with you is defeated; you are defeated with 1 physical trauma", () => {
    let ghoul = "";
    let r = game({
      investigators: [R, D],
      prep: (g) => {
        hand(g, R, "03189");
        ghoul = enemyHere(g, R, RAVENOUS);
      },
    });
    r = until(pick(r, /^Play "I'll see you in hell!"/), (x) => x.state.pending?.inv === D);
    expect(zoneOf(r, ghoul)).not.toBe(ZONE.Enemy);
    expect(inv(gOf(r), R).status).toBe("defeated");
    expect(inv(gOf(r), R).physicalTrauma).toBe(1);
    expect(inv(gOf(r), R).damage).toBe(0);
  });
});

describe(".45 Automatic (03190)", () => {
  it("+2 combat, +1 damage; a failed attack ignores retaliate", () => {
    let r = game({
      investigators: [R],
      bag: ["autoFail"],
      prep: (g) => {
        inPlay(g, R, "03190");
        enemyHere(g, R, GOAT);
      },
    });
    r = toTurn(use(r, "03190"), R);
    expect(inv(gOf(r), R).damage).toBe(0);
    expect(mine(r, R, "03190")?.uses).toBe(3);
  });

  it("a plain failed attack on Goat Spawn draws its retaliate", () => {
    let r = game({
      investigators: [R],
      bag: ["autoFail"],
      prep: (g) => void enemyHere(g, R, GOAT),
    });
    r = toTurn(fight(r, GOAT), R);
    expect(inv(gOf(r), R).damage).toBe(1);
  });
});

describe("Logical Reasoning (03191)", () => {
  it("with a clue: an investigator here heals 2 horror or discards a Terror from their threat area", () => {
    let frozen = "";
    let r = game({
      investigators: [R],
      prep: (g) => {
        hand(g, R, "03191");
        hand(g, R, "03191");
        setCounter(g, R, "clues", 1);
        setCounter(g, R, "horror", 3);
        frozen = createCard(g, FROZEN, ZONE.Limbo);
        moveCard(g, frozen, ZONE.Threat);
        setController(g, frozen, R);
      },
    });
    r = toTurn(pick(pick(r, /^Play Logical Reasoning/), "Heal 2 horror"), R);
    expect(inv(gOf(r), R).horror).toBe(1);
    r = toTurn(pick(pick(r, /^Play Logical Reasoning/), /^Discard a Terror/), R);
    expect(threatArea(gOf(r), R)).toEqual([]);
  });
});

describe("Archaic Glyphs (03192, 03193)", () => {
  it("Researched by the translated glyphs; 1 more clue per 2 points succeeded by", () => {
    expect(db.cards["03192"].keywords).toContainEqual({
      researched: { log: "translatedTheGlyphs" },
    });
    let r = game({ investigators: [R], bag: ["+1"], prep: (g) => void inPlay(g, R, "03192") });
    // Roland's 3 intellect +1 against the Study's 2 shroud: 2 over, 2 clues
    r = toTurn(use(r, "03192"), R);
    expect(inv(gOf(r), R).clues).toBe(2);
    expect(mine(r, R, "03192")?.uses).toBe(2);
  });

  it("on a success you may evade an engaged enemy; no attack of opportunity", () => {
    let ghoul = "";
    let r = game({
      investigators: [R],
      bag: ["0"],
      prep: (g) => {
        inPlay(g, R, "03193");
        ghoul = enemyHere(g, R, RAVENOUS);
      },
    });
    r = until(use(r, "03193"), offered(/^Evade an enemy engaged with you/));
    expect(inv(gOf(r), R).damage).toBe(0);
    r = toTurn(pick(r, /^Evade an enemy/), R);
    expect(card(gOf(r), ghoul)).toMatchObject({ exhausted: true, engagedWith: null });
  });
});

describe("Cheap Shot (03194)", () => {
  it("adds your agility; succeeding by 2 or more evades the attacked enemy", () => {
    let ghoul = "";
    let r = game({
      investigators: [R],
      bag: ["0"],
      prep: (g) => {
        hand(g, R, "03194");
        ghoul = enemyHere(g, R, RAVENOUS);
      },
    });
    r = toTurn(pick(r, /^Play Cheap Shot/), R);
    expect(lastTest(r)?.total).toBe(6);
    expect(card(gOf(r), ghoul)).toMatchObject({ damage: 1, exhausted: true, engagedWith: null });
  });
});

describe("Pickpocketing (03195)", () => {
  it("after you evade: draw 1 or gain 1; both if you succeeded by 2 or more", () => {
    let r = game({
      investigators: [R],
      bag: ["+1"],
      prep: (g) => {
        inPlay(g, R, "03195");
        enemyHere(g, R, MINION);
      },
    });
    const n = inv(gOf(r), R).hand.length;
    const res = inv(gOf(r), R).resources;
    r = until(evade(r, MINION), offered(/^Pickpocketing/));
    r = pick(r, /^Pickpocketing/);
    r = toTurn(pick(r, "Gain 1 resource"), R);
    expect(inv(gOf(r), R).resources).toBe(res + 1);
    expect(inv(gOf(r), R).hand.length).toBe(n);
  });
});

describe("Quantum Flux (03196)", () => {
  it("your discard pile shuffled into your deck, draw 1; it leaves the game", () => {
    let flux = "";
    let r = game({
      investigators: [R],
      prep: (g) => {
        flux = hand(g, R, "03196");
        for (const id of inv(g, R).deck.slice(0, 3)) moveCard(g, id, ZONE.Discard);
      },
    });
    const deck = inv(gOf(r), R).deck.length;
    r = toTurn(pick(r, /^Play Quantum Flux/), R);
    expect(inv(gOf(r), R).discard).toEqual([]);
    expect(inv(gOf(r), R).deck.length).toBe(deck + 3 - 1);
    expect(zoneOf(r, flux)).toBe(ZONE.Removed);
  });
});

describe("Recharge (03197)", () => {
  it("3 charges on a Spell asset here, or it is discarded on a symbol token", () => {
    let r = game({
      investigators: [R],
      bag: ["0"],
      prep: (g) => {
        hand(g, R, "03197");
        inPlay(g, R, SHRIVELLING);
      },
    });
    r = toTurn(pick(r, /^Play Recharge/), R);
    expect(mine(r, R, SHRIVELLING)?.uses).toBe(7);
    r = game({
      investigators: [R],
      bag: ["skull"],
      prep: (g) => {
        hand(g, R, "03197");
        inPlay(g, R, SHRIVELLING);
      },
    });
    r = toTurn(pick(r, /^Play Recharge/), R);
    expect(mine(r, R, SHRIVELLING)).toBeUndefined();
  });
});

describe("Madame Labranche (03198)", () => {
  it("with no cards in hand: draw 1; with no resources: gain 1", () => {
    let r = game({
      investigators: [R],
      prep: (g) => {
        inPlay(g, R, "03198");
        for (const h of inv(g, R).hand.slice()) moveCard(g, h, ZONE.Discard);
        setCounter(g, R, "resources", 0);
      },
    });
    expect(options(r).filter((o) => o.startsWith("Madame Labranche"))).toHaveLength(2);
    r = toTurn(pick(r, /^Madame Labranche: draw/), R);
    expect(inv(gOf(r), R).hand).toHaveLength(1);
    expect(options(r).some((o) => o.startsWith("Madame Labranche"))).toBe(false);
  });
});

describe("Snare Trap (03199)", () => {
  it("a non-Elite enemy entering its location is exhausted, disengaged and trapped; it doesn't ready, the trap goes", () => {
    let trap = "";
    let r = game({ investigators: [R], prep: (g) => void (trap = hand(g, R, "03199")) });
    r = toTurn(pick(r, /^Play Snare Trap/), R);
    expect(zoneOf(r, trap)).toBe(ZONE.Attached);
    const s = spawnHere(r, R, RAVENOUS);
    r = toTurn(s.r, R);
    expect(card(gOf(r), s.id)).toMatchObject({ exhausted: true, engagedWith: null });
    expect(card(gOf(r), trap).attachedTo).toBe(s.id);
    r = toTurn(pick(r, "End turn"), R);
    expect(card(gOf(r), s.id).exhausted).toBe(true);
    expect(zoneOf(r, trap)).toBe(ZONE.Discard);
  });
});
