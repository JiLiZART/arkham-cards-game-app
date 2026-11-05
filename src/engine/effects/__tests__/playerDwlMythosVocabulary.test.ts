/**
 * The vocabulary the Miskatonic Museum and Essex County Express player cards added (player-cards-dwl, tasks 2.1 and
 * 3.1): one test per entry.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../../content";
import type { Result } from "../../index";
import { checkCondition, enemies } from "../../queries";
import { card, inv, placeInvestigator, setCounter, type GameContext } from "../../context";
import { createCard, moveCard, putOnTop } from "../../movement";
import { addLocation, enemyHere, game, inject, inPlay, lastTest, toTurn } from "../../kits/driver";
import { commitDone, gOf, locId, options, pick, putEnemy } from "../../kits/testkit";
import { STEP } from "../../steps/step";
import { ZONE } from "../../world/constants";
import type { Effect } from "../../../content/schema";

beforeAll(() => loadPack("dwl"));

const R = "01001"; // Roland: combat 4, agility 2
const D = "01002"; // Daisy
const STUDY = "01111";
const HALLWAY = "01112";
const MINION = "01160"; // Ghoul Minion: fight 2, health 2, evade 2, damage 1
const RAVENOUS = "01161"; // Ravenous Ghoul: fight 3, health 3, evade 3, damage 1
const PRIEST = "01116"; // Ghoul Priest: fight 4, health 5 (per investigator), damage 2

const eff = (r: Result, e: Effect, you = R, source: string | null = null) =>
  inject(r, () => {}, { t: STEP.Eff, effect: e, ctx: { you, source } });
const hallway = (game: GameContext) => addLocation(game, HALLWAY, [[STUDY, HALLWAY]]);

describe("fight: damageBonus as an amount", () => {
  it("is counted from the context as the attack starts", () => {
    let r = game({
      investigators: [R],
      bag: ["0"],
      prep: (g) => {
        setCounter(g, R, "clues", 2);
        putEnemy(g, PRIEST, inv(g, R).location!, R);
      },
    });
    r = toTurn(commitDone(eff(r, { op: "fight", damageBonus: { yourClues: 1 } })), R);
    expect(enemies(gOf(r))[0].damage).toBe(3);
  });
});

describe("fight: extraDamageIf, checked as the damage is dealt", () => {
  it("sees the tokens the test revealed", () => {
    let r = game({
      investigators: [R],
      bag: ["tablet"],
      prep: (g) => void putEnemy(g, PRIEST, inv(g, R).location!, R),
    });
    r = toTurn(
      commitDone(
        eff(r, {
          op: "fight",
          bonus: 3,
          extraDamageIf: { testTokens: ["tablet"] },
          extraDamage: 2,
        }),
      ),
      R,
    );
    expect(lastTest(r)?.success).toBe(true);
    expect(enemies(gOf(r))[0].damage).toBe(3);
  });
});

describe("addUses: double, usesType", () => {
  it("doubles the uses of an asset whose uses are of a kind named", () => {
    let gun = "";
    let r = game({
      investigators: [R],
      prep: (g) => {
        gun = inPlay(g, R, "01016"); // .45 Automatic: 4 ammo
        inPlay(g, R, "01030"); // Magnifying Glass: no uses
      },
    });
    r = toTurn(
      eff(r, { op: "addUses", double: true, usesType: ["ammo"], filter: { type: "asset" } }),
      R,
    );
    expect(card(gOf(r), gun).uses).toBe(8);
  });
});

describe("redirectDamage", () => {
  it("the failed attack's damage goes to another enemy at your location", () => {
    let other = "";
    let r = game({
      investigators: [R],
      bag: ["autoFail"],
      prep: (g) => {
        putEnemy(g, PRIEST, inv(g, R).location!, R);
        other = putEnemy(g, RAVENOUS, inv(g, R).location!, null);
      },
    });
    r = eff(r, { op: "fight", damageBonus: 1, onFail: [{ op: "redirectDamage" }] });
    r = toTurn(commitDone(pick(r, "Ghoul Priest")), R);
    expect(lastTest(r)?.success).toBe(false);
    expect(card(gOf(r), other).damage).toBe(2);
  });
});

describe("evade: all engaged", () => {
  it("evades every enemy engaged with you, not those at your location", () => {
    let a = "";
    let b = "";
    let r = game({
      investigators: [R],
      prep: (g) => {
        a = enemyHere(g, R, MINION);
        b = enemyHere(g, R, MINION, false);
      },
    });
    r = toTurn(eff(r, { op: "evade", all: "engaged" }), R);
    expect(card(gOf(r), a).exhausted).toBe(true);
    expect(card(gOf(r), a).engagedWith).toBe(null);
    expect(card(gOf(r), b).exhausted).toBe(false);
  });
});

describe("searchDeck: chooseAny, intoPlay", () => {
  it("you search the chosen investigator's deck and put the card found into play under your control", () => {
    let cop = "";
    let r = game({
      investigators: [R, D],
      prep: (g) => {
        cop = createCard(g, "01018", ZONE.Limbo, D);
        putOnTop(g, D, [cop]);
      },
    });
    r = eff(r, {
      op: "searchDeck",
      top: 3,
      filter: { trait: "Ally" },
      target: "chooseAny",
      intoPlay: true,
    });
    expect(options(r)).toEqual(["Roland Banks", "Daisy Walker"]);
    r = pick(r, "Daisy Walker");
    expect(r.state.pending?.inv).toBe(R);
    r = toTurn(pick(r, "Beat Cop"), R);
    expect(card(gOf(r), cop).zone).toBe(ZONE.Play);
    expect(card(gOf(r), cop).controller).toBe(R);
  });
});

describe("conditions", () => {
  it("testEnemyEngagedWithYou: the enemy of the test under way is engaged with you", () => {
    const gain = (engaged: boolean) => {
      let r = game({
        investigators: [R],
        bag: ["autoFail"],
        prep: (g) => void putEnemy(g, PRIEST, inv(g, R).location!, engaged ? R : null),
      });
      const before = inv(gOf(r), R).resources;
      r = eff(r, {
        op: "fight",
        onFail: [
          {
            op: "chooseOne",
            options: [
              {
                label: "engaged",
                condition: { testEnemyEngagedWithYou: true },
                effects: [{ op: "gainResources", amount: 1 }],
              },
            ],
          },
        ],
      });
      return inv(gOf(toTurn(commitDone(r), R)), R).resources - before;
    };
    expect(gain(true)).toBe(1);
    expect(gain(false)).toBe(0);
  });

  it("resignInPlay: a revealed scenario card with a resign ability", () => {
    const g = gOf(game({ investigators: [R] }));
    expect(checkCondition(g, { resignInPlay: true }, { you: R })).toBe(false);
    addLocation(g, "02048", [[STUDY, "02048"]]); // Miskatonic Quad
    expect(checkCondition(g, { resignInPlay: true }, { you: R })).toBe(true);
  });

  it("aloneAtYourLocation: no other investigator is at your location", () => {
    const g = gOf(game({ investigators: [R, D] }));
    expect(checkCondition(g, { aloneAtYourLocation: true }, { you: R })).toBe(false);
    placeInvestigator(g, D, hallway(g));
    expect(checkCondition(g, { aloneAtYourLocation: true }, { you: R })).toBe(true);
  });
});

describe("Amount eventEnemyStat", () => {
  it("is the event enemy's damage or horror", () => {
    let priest = "";
    let r = game({
      investigators: [R],
      prep: (g) => void (priest = putEnemy(g, PRIEST, inv(g, R).location!, null)),
    });
    r = toTurn(
      inject(r, () => {}, {
        t: STEP.Eff,
        effect: { op: "dealDamage", amount: { eventEnemyStat: "damage" }, to: "eventEnemy" },
        ctx: { you: R, enemy: priest },
      }),
      R,
    );
    expect(card(gOf(r), priest).damage).toBe(2);
  });
});

describe("flag luresEnemies", () => {
  it("a Patrol or Hunter enemy that moves in the enemy phase moves toward the location instead", () => {
    let rats = "";
    let r = game({
      investigators: [R],
      prep: (g) => {
        hallway(g);
        const attic = addLocation(g, "01113", [[HALLWAY, "01113"]]);
        placeInvestigator(g, R, attic);
        rats = putEnemy(g, "01159", locId(g, HALLWAY), null); // Swarm of Rats: hunter
        const lure = createCard(g, "02156", ZONE.Limbo, R);
        moveCard(g, lure, ZONE.Attached, { location: locId(g, STUDY) });
      },
    });
    // outside the enemy phase the rats hunt Roland
    let x = inject(r, () => {}, { t: STEP.HunterMoves });
    expect(card(gOf(x), card(gOf(x), rats).location!).code).toBe("01113");
    x = inject(r, (g) => (g.s.phase = "enemy"), { t: STEP.HunterMoves });
    expect(card(gOf(x), card(gOf(x), rats).location!).code).toBe(STUDY);
    r = x;
  });
});

describe("soaksForLocation: damageAndHorror", () => {
  it("the asset may take horror dealt to another investigator at its controller's location", () => {
    let r = game({
      investigators: [R, D],
      prep: (g) => void inPlay(g, R, "02106"),
    });
    r = inject(r, () => {}, {
      t: STEP.AssignDamage,
      inv: D,
      damage: 0,
      horror: 1,
      direct: false,
      source: null,
    });
    expect(options(r).some((o) => o.includes("Brother Xavier"))).toBe(true);
  });
});
