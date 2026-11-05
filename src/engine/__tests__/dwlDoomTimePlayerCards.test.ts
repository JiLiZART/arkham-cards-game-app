/**
 * The player cards of Where Doom Awaits and Lost in Time and Space (player-cards-dwl, groups 6 and 7): one test each,
 * at least. "I've had worse…", Fine Clothes and Ward of Protection 5 are tested with the vocabulary they brought
 * (effects/__tests__/playerDwlDoomTimeVocabulary.test.ts).
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
import { baseSkill } from "../queries";
import { createCard, moveCard } from "../movement";
import { STEP } from "../steps/step";
import { ZONE } from "../world/constants";
import type { Result } from "../index";
import type { Effect } from "../../content/schema";

beforeAll(() => loadPack("dwl"));

const R = "01001"; // Roland: willpower 3, intellect 3, combat 4, agility 2
const D = "01002"; // Daisy
const STUDY = "01111"; // shroud 2
const CELLAR = "01114"; // shroud 4
const MINION = "01160"; // Ghoul Minion: fight 2, health 2, evade 2, damage 1
const RAVENOUS = "01161"; // Ravenous Ghoul: fight 3, health 3, evade 3
const PRIEST = "01116"; // Ghoul Priest: Elite, fight 4, health 5

const cardOf = (r: Result, id: string) => card(gOf(r), id);
const test = (r: Result, e: Effect, you = R) =>
  inject(r, () => {}, { t: STEP.Eff, effect: e, ctx: { you, source: null } });
const resources = (r: Result, i = R) => inv(gOf(r), i).resources;
const rich = (game: GameContext) => void addCounter(game, R, "resources", 10);

describe("Where Doom Awaits", () => {
  it("Leadership: [willpower][wild] more when committed to another investigator's test", () => {
    let r = game({ investigators: [R, D], bag: ["0"], prep: (g) => void hand(g, D, "02260") });
    r = test(r, { op: "skillTest", skill: "willpower", difficulty: 6 });
    r = until(commitDone(r), (x) => x.state.pending?.inv === D);
    r = toTurn(commitDone(pick(r, "Commit Leadership (+3)")), R);
    expect(lastTest(r)?.success).toBe(true);
  });

  it("Strange Solution (Acidic Ichor): a base combat of 6, +2 damage; Researched", () => {
    let ghoul = "";
    let r = game({
      investigators: [R],
      bag: ["0"],
      prep: (g) => {
        inPlay(g, R, "02263");
        ghoul = enemyHere(g, R, RAVENOUS);
      },
    });
    r = toTurn(commitDone(use(r, "02263")), R);
    expect(lastTest(r)?.base).toBe(6);
    expect(cardOf(r, ghoul).zone).not.toBe(ZONE.Enemy);
    expect(gOf(r).db.cards["02263"].keywords).toContainEqual({
      researched: { log: "identifiedTheSolution" },
    });
  });

  it("Strange Solution (Freezing Variant): evade with a base agility of 6", () => {
    let ghoul = "";
    let r = game({
      investigators: [R],
      bag: ["0"],
      prep: (g) => {
        inPlay(g, R, "02264");
        ghoul = enemyHere(g, R, RAVENOUS);
      },
    });
    r = toTurn(commitDone(use(r, "02264")), R);
    expect(lastTest(r)?.base).toBe(6);
    expect(cardOf(r, ghoul).exhausted).toBe(true);
  });

  it('Joey "The Rat" Vigil: 1 resource to play an Item asset from your hand, paying its cost', () => {
    let gun = "";
    let r = game({
      investigators: [R],
      prep: (g) => {
        inPlay(g, R, "02265");
        gun = hand(g, R, "01016"); // .45 Automatic: cost 4
        setCounter(g, R, "resources", 5);
      },
    });
    const actions = inv(gOf(r), R).actionsLeft;
    r = toTurn(pick(use(r, "02265"), ".45 Automatic"), R);
    expect(cardOf(r, gun).zone).toBe(ZONE.Play);
    expect(resources(r)).toBe(0);
    expect(inv(gOf(r), R).actionsLeft).toBe(actions);
  });

  it("Ace in the Hole: 3 more actions this turn", () => {
    let r = game({ investigators: [R], prep: (g) => void hand(g, R, "02266") });
    const actions = inv(gOf(r), R).actionsLeft;
    r = toTurn(play(r, "02266"), R);
    expect(inv(gOf(r), R).actionsLeft).toBe(actions + 3);
  });

  it("Moonlight Ritual: all doom off a card you control", () => {
    let asset = "";
    let r = game({
      investigators: [R],
      prep: (g) => {
        hand(g, R, "02267");
        asset = inPlay(g, R, "01006");
        setCounter(g, asset, "doom", 3);
      },
    });
    r = toTurn(play(r, "02267"), R);
    expect(cardOf(r, asset).doom).toBe(0);
  });

  it("Fearless (2): heals 1 horror on a success, 2 on a success by 2 or more", () => {
    const heal = (difficulty: number) => {
      let r = game({
        investigators: [R],
        bag: ["0"],
        prep: (g) => {
          hand(g, R, "02268");
          setCounter(g, R, "horror", 3);
        },
      });
      r = test(r, { op: "skillTest", skill: "willpower", difficulty });
      r = toTurn(commitDone(pick(r, /^Commit Fearless/)), R);
      return 3 - inv(gOf(r), R).horror;
    };
    expect(heal(5)).toBe(1); // 3 + 2 icons: by 0
    expect(heal(3)).toBe(2); // by 2
  });

  it("Jewel of Aureolus: a symbol in a test at your location, exhaust: draw 1 or gain 2 resources", () => {
    let r = game({
      investigators: [R, D],
      bag: ["skull"],
      prep: (g) => void inPlay(g, R, "02269"),
    });
    const before = resources(r);
    // Daisy's test, at Roland's location
    r = until(commitDone(test(r, { op: "skillTest", skill: "willpower", difficulty: 1 }, D)), (x) =>
      options(x).some((o) => o.startsWith("Jewel of Aureolus")),
    );
    r = toTurn(pick(pick(r, /^Jewel of Aureolus/), "Gain 2 resources"), R);
    expect(resources(r)).toBe(before + 2);
  });

  it("A Chance Encounter: an Ally from any discard pile into play, discarded at the end of the round", () => {
    let cop = "";
    let r = game({
      investigators: [R, D],
      prep: (g) => {
        hand(g, R, "02270");
        cop = createCard(g, "01018", ZONE.Limbo, D); // Beat Cop
        moveCard(g, cop, ZONE.Discard);
      },
    });
    r = toTurn(play(r, "02270"), R);
    expect(cardOf(r, cop).zone).toBe(ZONE.Play);
    expect(cardOf(r, cop).controller).toBe(R);
    r = until(r, (x) => x.state.round === 2);
    expect(cardOf(r, cop).zone).toBe(ZONE.Discard);
  });

  it("Stroke of Luck: exiled after the reveal, the test succeeds; not after an auto-fail", () => {
    const run = (token: "-2" | "autoFail") => {
      let luck = "";
      let r = game({
        investigators: [R],
        bag: [token],
        prep: (g) => void (luck = hand(g, R, "02271")),
      });
      r = test(r, { op: "skillTest", skill: "willpower", difficulty: 6 });
      r = until(commitDone(pick(r, /^Commit Stroke of Luck/)), (x) =>
        options(x).some((o) => o.startsWith("Exile Stroke of Luck") || o === "End turn"),
      );
      return { r, luck };
    };
    const { r, luck } = run("-2");
    const after = toTurn(pick(r, /^Exile Stroke of Luck/), R);
    expect(lastTest(after)?.success).toBe(true);
    expect(cardOf(after, luck).zone).toBe(ZONE.Removed);
    expect(options(run("autoFail").r)).toContain("End turn");
  });

  it("Moment of Respite: only with no enemy at your location; heals 3 horror and draws 1", () => {
    let r = game({
      investigators: [R],
      prep: (g) => {
        hand(g, R, "02273");
        rich(g);
        setCounter(g, R, "horror", 4);
        enemyHere(g, R, MINION);
      },
    });
    expect(options(r).some((o) => o.startsWith("Play Moment of Respite"))).toBe(false);
    r = game({
      investigators: [R],
      prep: (g) => {
        hand(g, R, "02273");
        rich(g);
        setCounter(g, R, "horror", 4);
      },
    });
    const n = inv(gOf(r), R).deck.length;
    r = toTurn(play(r, "02273"), R);
    expect(inv(gOf(r), R).horror).toBe(1);
    expect(inv(gOf(r), R).deck.length).toBe(n - 1);
  });
});

describe("Lost in Time and Space", () => {
  it("Vicious Blow (2): +1 damage on a successful attack, +2 by 2 or more", () => {
    let ghoul = "";
    let r = game({
      investigators: [R],
      bag: ["0"],
      prep: (g) => {
        hand(g, R, "02299");
        ghoul = enemyHere(g, R, PRIEST); // fight 4: 4 + 2 icons succeeds by 2
      },
    });
    r = test(r, { op: "fight" });
    r = toTurn(commitDone(pick(r, /^Commit Vicious Blow/)), R);
    expect(cardOf(r, ghoul).damage).toBe(3);
  });

  it("Monster Slayer (5): a successful attack defeats a non-Elite enemy; an Elite one takes its damage", () => {
    const slay = (code: string) => {
      let enemy = "";
      let r = game({
        investigators: [R],
        bag: ["+1"],
        prep: (g) => {
          hand(g, R, "02300");
          rich(g);
          enemy = enemyHere(g, R, code);
        },
      });
      r = toTurn(commitDone(play(r, "02300")), R);
      return cardOf(r, enemy);
    };
    expect(slay(RAVENOUS).zone).not.toBe(ZONE.Enemy);
    const priest = slay(PRIEST);
    expect(priest.zone).toBe(ZONE.Enemy);
    expect(priest.damage).toBe(1);
  });

  it("Lightning Gun: +5 combat and +2 damage", () => {
    let ghoul = "";
    let r = game({
      investigators: [R],
      bag: ["0"],
      prep: (g) => {
        inPlay(g, R, "02301");
        ghoul = enemyHere(g, R, PRIEST);
      },
    });
    r = toTurn(commitDone(use(r, "02301")), R);
    expect(lastTest(r)?.total).toBe(9);
    expect(cardOf(r, ghoul).damage).toBe(3);
  });

  it("Dr. William T. Maleson: a clue on your location to cancel the draw and draw anew", () => {
    let top = "";
    let r = game({
      investigators: [R],
      prep: (g) => {
        inPlay(g, R, "02302");
        setCounter(g, R, "clues", 1);
        setCounter(g, inv(g, R).location!, "clues", 0);
        top = createCard(g, "01163", ZONE.Limbo);
        moveCard(g, top, ZONE.EncounterDeck, { top: true });
      },
    });
    const drawn = r.state.log.filter((e) => e.type === "encounter").length;
    r = until(
      inject(r, () => {}, { t: STEP.DrawEncounter, inv: R }),
      (x) => windowOf(x) === "encounterDrawn",
    );
    r = toTurn(pick(r, /^Dr. William T. Maleson/), R);
    expect(inv(gOf(r), R).clues).toBe(0);
    expect(cardOf(r, inv(gOf(r), R).location!).clues).toBe(1);
    expect(r.state.log.filter((e) => e.type === "encounter").length).toBe(drawn + 2);
    expect(r.state.log.some((e) => e.type === "cancelled" && e.card === top)).toBe(true);
  });

  it("Deciphered Reality: the highest shroud, and a clue from each revealed location", () => {
    let cellar = "";
    let r = game({
      investigators: [R],
      bag: ["+1"],
      prep: (g) => {
        hand(g, R, "02303");
        rich(g);
        cellar = addLocation(g, CELLAR, [[STUDY, CELLAR]]);
        setCounter(g, cellar, "clues", 2);
        setCounter(g, inv(g, R).location!, "clues", 2);
      },
    });
    r = toTurn(commitDone(play(r, "02303")), R);
    expect(lastTest(r)?.difficulty).toBe(4);
    expect(inv(gOf(r), R).clues).toBe(2);
    expect(cardOf(r, cellar).clues).toBe(1);
  });

  it("Chicago Typewriter: each more action spent is +2 combat; +2 damage", () => {
    let ghoul = "";
    let r = game({
      investigators: [R],
      bag: ["0"],
      prep: (g) => {
        inPlay(g, R, "02304");
        ghoul = enemyHere(g, R, PRIEST);
      },
    });
    r = use(r, "02304"); // 2 actions left
    r = toTurn(commitDone(pick(r, "Spend 2 more action(s): +6 combat")), R);
    expect(lastTest(r)?.total).toBe(10);
    expect(cardOf(r, ghoul).damage).toBe(3);
    expect(inv(gOf(r), R).actionsLeft).toBe(0);
  });

  it("The Gold Pocket Watch: removed from the game to skip a phase as it begins", () => {
    let watch = "";
    let r = game({
      investigators: [R],
      prep: (g) => {
        watch = inPlay(g, R, "02305");
        enemyHere(g, R, MINION);
      },
    });
    // the enemy phase begins: skipped, the Ghoul Minion does not attack
    r = until(
      pick(r, "End turn"),
      (x) =>
        options(x).includes("The Gold Pocket Watch: skip this phase") && x.state.phase === "enemy",
    );
    r = toTurn(pick(r, "The Gold Pocket Watch: skip this phase"), R);
    expect(cardOf(r, watch).zone).toBe(ZONE.Removed);
    expect(inv(gOf(r), R).damage).toBe(0);
  });

  it("The Gold Pocket Watch: removed from the game to repeat a phase after it ends", () => {
    let r = game({ investigators: [R], prep: (g) => void inPlay(g, R, "02305") });
    const before = resources(r);
    r = until(pick(r, "End turn"), (x) => windowOf(x) === "upkeepPhaseEnds");
    r = toTurn(pick(r, "The Gold Pocket Watch: repeat this phase"), R);
    // the upkeep phase twice: 2 resources
    expect(resources(r)).toBe(before + 2);
  });

  it("Shrivelling (5): willpower +3, +2 damage; a symbol costs 2 horror", () => {
    let ghoul = "";
    let r = game({
      investigators: [R],
      bag: ["cultist"],
      prep: (g) => {
        inPlay(g, R, "02306");
        ghoul = enemyHere(g, R, MINION);
      },
    });
    r = toTurn(commitDone(use(r, "02306")), R);
    expect(inv(gOf(r), R).horror).toBe(2);
    expect(lastTest(r)?.base).toBe(6);
    expect(cardOf(r, ghoul).zone).not.toBe(ZONE.Enemy); // 3 damage on its 2 health
  });

  it("Aquinnah (3): an enemy's attack damage goes to another enemy at your location", () => {
    let attacker = "";
    let other = "";
    let r = game({
      investigators: [R],
      prep: (g) => {
        inPlay(g, R, "02308");
        attacker = enemyHere(g, R, MINION);
        other = enemyHere(g, R, RAVENOUS, false);
      },
    });
    r = until(
      inject(r, () => {}, {
        t: STEP.EnemyAttack,
        enemy: attacker,
        inv: R,
        aoo: false,
        key: "atk:t",
      }),
      (x) => options(x).some((o) => o.startsWith("Aquinnah")),
    );
    r = toTurn(pick(r, /^Aquinnah/), R);
    expect(cardOf(r, other).damage).toBe(1);
    expect(inv(gOf(r), R).damage).toBe(0);
  });

  it("Try and Try Again: after a failed test, a skill card you committed back to your hand", () => {
    let guts = "";
    let r = game({
      investigators: [R],
      bag: ["autoFail"],
      prep: (g) => {
        inPlay(g, R, "02309");
        guts = hand(g, R, "01089");
      },
    });
    r = test(r, { op: "skillTest", skill: "willpower", difficulty: 2 });
    r = until(commitDone(pick(r, /^Commit Guts/)), (x) =>
      options(x).some((o) => o.startsWith("Try and Try Again")),
    );
    r = toTurn(pick(r, /^Try and Try Again/), R);
    expect(cardOf(r, guts).zone).toBe(ZONE.Hand);
  });

  it("The Red-Gloved Man: two base skills are 6 while he is in play; discarded as the mythos phase ends", () => {
    let man = "";
    let r = game({
      investigators: [R],
      prep: (g) => {
        man = hand(g, R, "02310");
        rich(g);
      },
    });
    r = pick(pick(play(r, "02310"), "agility"), "intellect");
    r = toTurn(r, R);
    expect(baseSkill(gOf(r), R, "agility")).toBe(6);
    expect(baseSkill(gOf(r), R, "intellect")).toBe(6);
    expect(baseSkill(gOf(r), R, "combat")).toBe(4);
    r = toTurn(
      inject(r, () => {}, { t: STEP.Window, trigger: "mythosEnds", data: {} }),
      R,
    );
    expect(cardOf(r, man).zone).toBe(ZONE.Discard);
    expect(baseSkill(gOf(r), R, "agility")).toBe(2);
  });
});
