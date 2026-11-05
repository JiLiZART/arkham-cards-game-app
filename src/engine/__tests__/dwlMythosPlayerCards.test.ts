/**
 * The player cards of The Miskatonic Museum and The Essex County Express (player-cards-dwl, groups 2 and 3): one test
 * each, at least.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import { card, inv, placeInvestigator, ready, setCounter } from "../context";
import type { GameContext } from "../context";
import {
  addLocation,
  enemyHere,
  game,
  hand,
  inject,
  inPlay,
  investigate,
  lastTest,
  play,
  toTurn,
  until,
  use,
  windowOf,
} from "../kits/driver";
import { commitDone, deckCodes, gOf, locId, options, pick, putEnemy } from "../kits/testkit";
import { createCard, putOnTop } from "../movement";
import { controlled, enemies } from "../queries";
import { STEP } from "../steps/step";
import { ZONE } from "../world/constants";
import { EVENT } from "../events/event";
import { exiled } from "../world/flags";
import type { Result } from "../index";

beforeAll(() => loadPack("dwl"));

const ROLAND = "01001"; // willpower 3, intellect 3, combat 4, agility 2
const DAISY = "01002"; // intellect 5
const STUDY = "01111"; // shroud 2
const HALLWAY = "01112";
const ATTIC = "01113";
const MINION = "01160"; // Ghoul Minion: fight 2, health 2, evade 2, damage 1, horror 1
const RAVENOUS = "01161"; // Ravenous Ghoul: fight 3, health 3, evade 3, damage 1, horror 1
const RATS = "01159"; // Swarm of Rats: hunter, health 1
const BEAT_COP = "01018"; // an Ally, health 2

const hallway = (game: GameContext, clues = 0) => {
  const id = addLocation(game, HALLWAY, [[STUDY, HALLWAY]]);
  setCounter(game, id, "clues", clues);
  return id;
};
const cardOf = (r: Result, id: string) => card(gOf(r), id);
const at = (r: Result, id: string) => card(gOf(r), cardOf(r, id).location!).code;
const where = (r: Result, i: string) => card(gOf(r), inv(gOf(r), i).location!).code;

describe("The Miskatonic Museum", () => {
  it("Emergency Aid heals 2 damage from an Ally another investigator at your location controls", () => {
    let cop = "";
    let r = game({
      investigators: [ROLAND, DAISY],
      prep: (g) => {
        hand(g, ROLAND, "02105");
        cop = inPlay(g, DAISY, BEAT_COP);
        setCounter(g, cop, "damage", 2);
        setCounter(g, ROLAND, "damage", 1);
      },
    });
    r = play(r, "02105");
    expect(options(r)).toEqual(["Roland Banks", "Daisy Walker", "Beat Cop"]);
    r = toTurn(pick(r, "Beat Cop"), ROLAND);
    expect(cardOf(r, cop).damage).toBe(0);
    expect(inv(gOf(r), ROLAND).damage).toBe(1);
  });

  it("Brother Xavier: +1 willpower; takes the horror dealt to another investigator at your location", () => {
    let xavier = "";
    let r = game({
      investigators: [ROLAND, DAISY],
      prep: (g) => (xavier = inPlay(g, ROLAND, "02106")),
    });
    r = inject(r, () => {}, {
      t: STEP.Eff,
      effect: { op: "skillTest", skill: "willpower", difficulty: 0 },
      ctx: { you: ROLAND, source: null },
    });
    r = toTurn(r, ROLAND);
    expect(lastTest(r)?.base).toBe(4);
    r = inject(r, () => {}, {
      t: STEP.AssignDamage,
      inv: DAISY,
      damage: 0,
      horror: 1,
      direct: false,
      source: null,
    });
    r = pick(r, /Brother Xavier/);
    r = toTurn(r, ROLAND);
    expect(cardOf(r, xavier).horror).toBe(1);
    expect(inv(gOf(r), DAISY).horror).toBe(0);
  });

  it("Brother Xavier deals 2 damage to an enemy at your location when he is defeated", () => {
    let xavier = "";
    let r = game({
      investigators: [ROLAND],
      prep: (g) => {
        xavier = inPlay(g, ROLAND, "02106");
        setCounter(g, xavier, "damage", 2);
        enemyHere(g, ROLAND, RAVENOUS, false);
      },
    });
    r = inject(r, () => {}, {
      t: STEP.AssignDamage,
      inv: ROLAND,
      damage: 1,
      horror: 0,
      direct: false,
      source: null,
    });
    r = pick(r, /Brother Xavier/);
    r = until(r, (x) => windowOf(x) === "assetDefeated");
    r = toTurn(pick(r, /^Brother Xavier: deal 2 damage/), ROLAND);
    expect(enemies(gOf(r))[0].damage).toBe(2);
    expect(cardOf(r, xavier).zone).toBe(ZONE.Discard);
  });

  it(`"I've got a plan!" attacks with intellect and deals +1 damage per clue you have, at most +3`, () => {
    let r = game({
      investigators: [DAISY],
      bag: ["0"],
      prep: (g) => {
        hand(g, DAISY, "02107");
        setCounter(g, DAISY, "clues", 4);
        putEnemy(g, "01116", inv(g, DAISY).location!, DAISY); // Ghoul Priest: fight 4, health 5
      },
    });
    r = toTurn(commitDone(play(r, "02107")), DAISY);
    expect(lastTest(r)?.skill).toBe("intellect");
    expect(enemies(gOf(r))[0].damage).toBe(4);
  });

  it("Pathfinder moves you to a connecting location during your turn, while you are not engaged", () => {
    let r = game({
      investigators: [ROLAND],
      prep: (g) => {
        inPlay(g, ROLAND, "02108");
        hallway(g);
      },
    });
    const actions = inv(gOf(r), ROLAND).actionsLeft;
    r = toTurn(use(r, "02108"), ROLAND);
    expect(where(r, ROLAND)).toBe(HALLWAY);
    expect(inv(gOf(r), ROLAND).actionsLeft).toBe(actions);
    r = inject(r, (g) => {
      ready(g, controlled(g, ROLAND).find((c) => c.code === "02108")!.id);
      enemyHere(g, ROLAND);
    });
    expect(options(r).some((o) => o.startsWith("Pathfinder"))).toBe(false);
  });

  it("Contraband doubles the ammo on an asset at your location", () => {
    let gun = "";
    let r = game({
      investigators: [ROLAND, DAISY],
      prep: (g) => {
        hand(g, ROLAND, "02109");
        gun = inPlay(g, DAISY, "01016"); // .45 Automatic: 4 ammo
        setCounter(g, gun, "uses", 3);
        inPlay(g, ROLAND, "01087"); // Flashlight: supplies? no, 3 supplies
      },
    });
    r = play(r, "02109");
    r = toTurn(pick(r, ".45 Automatic"), ROLAND);
    expect(cardOf(r, gun).uses).toBe(6);
  });

  it("Delve Too Deep: each investigator draws an encounter card; it goes to the victory display", () => {
    let delve = "";
    let r = game({
      investigators: [ROLAND, DAISY],
      prep: (g) => (delve = hand(g, ROLAND, "02111")),
    });
    const from = r.state.log.length;
    r = toTurn(play(r, "02111"), ROLAND);
    const drawn = r.state.log
      .slice(from)
      .filter((e) => e.type === EVENT.Encounter)
      .map((e) => e.inv);
    expect(drawn).toEqual([ROLAND, DAISY]);
    expect(cardOf(r, delve).zone).toBe(ZONE.Victory);
  });

  it("Song of the Dead: a willpower attack, +1; a skull revealed deals +2 damage", () => {
    const song = (token: "skull" | "0") => {
      const r = game({
        investigators: [ROLAND],
        bag: [token],
        prep: (g) => {
          inPlay(g, ROLAND, "02112");
          putEnemy(g, "01116", inv(g, ROLAND).location!, ROLAND); // fight 4, health 5
          setCounter(g, ROLAND, "resources", 0);
        },
      });
      return toTurn(use(r, "02112"), ROLAND);
    };
    // willpower 3 + 1 = 4 against fight 4; a skull (-1 at Standard) fails it
    expect(lastTest(song("0"))?.success).toBe(true);
    expect(enemies(gOf(song("0")))[0].damage).toBe(1);
    expect(lastTest(song("skull"))?.success).toBe(false);
  });

  it("Song of the Dead's +2 damage counts when the skull came out of a test it still succeeds", () => {
    let r = game({
      investigators: [ROLAND],
      bag: ["skull"],
      prep: (g) => {
        inPlay(g, ROLAND, "02112");
        enemyHere(g, ROLAND, RAVENOUS); // fight 3, health 3
      },
    });
    // willpower 3 + 1 + skull -1 = 3 against fight 3
    r = toTurn(use(r, "02112"), ROLAND);
    expect(lastTest(r)?.success).toBe(true);
    expect(enemies(gOf(r))).toHaveLength(0);
  });

  it("Oops!: a failed attack by 2 or less on an enemy engaged with you deals its damage to another enemy here", () => {
    let priest = "";
    let other = "";
    let r = game({
      investigators: [ROLAND],
      bag: ["-2"],
      prep: (g) => {
        hand(g, ROLAND, "02113");
        priest = putEnemy(g, "01116", inv(g, ROLAND).location!, ROLAND); // fight 4
        other = putEnemy(g, RAVENOUS, inv(g, ROLAND).location!, null); // health 3
        inPlay(g, ROLAND, "01016"); // .45 Automatic: +1 combat, +1 damage
      },
    });
    // combat 4 + 1 - 2 = 3 against fight 4: failed by 1; the attack's 2 damage go to the Ravenous Ghoul
    r = commitDone(pick(use(r, "01016"), "Ghoul Priest"));
    r = until(r, (x) => windowOf(x) === "skillTestFailed");
    r = toTurn(pick(r, /Oops!/), ROLAND);
    expect(cardOf(r, other).damage).toBe(2);
    expect(cardOf(r, priest).damage).toBe(0);
  });

  it("Fire Extinguisher: +1 combat to fight; exiled, +3 agility to evade, and each other engaged enemy too", () => {
    let ext = "";
    let a = "";
    let b = "";
    let r = game({
      investigators: [ROLAND],
      bag: ["0"],
      prep: (g) => {
        ext = inPlay(g, ROLAND, "02114");
        a = enemyHere(g, ROLAND, RAVENOUS); // evade 3
        b = enemyHere(g, ROLAND, MINION);
      },
    });
    r = toTurn(commitDone(pick(use(r, "02114", 1), "Ravenous Ghoul")), ROLAND);
    // agility 2 + 3 = 5 against evade 3
    expect(lastTest(r)?.base).toBe(5);
    expect(cardOf(r, a).engagedWith).toBe(null);
    expect(cardOf(r, b).engagedWith).toBe(null);
    expect(cardOf(r, ext).zone).toBe(ZONE.Removed);
    expect(exiled.get(gOf(r), ROLAND)).toEqual(["02114"]);
  });

  it("Flare: fight with +3 combat and +2 damage, then exiled", () => {
    let flare = "";
    let r = game({
      investigators: [ROLAND],
      bag: ["0"],
      prep: (g) => {
        flare = hand(g, ROLAND, "02115");
        putEnemy(g, "01116", inv(g, ROLAND).location!, ROLAND); // fight 4, health 5
      },
    });
    r = pick(play(r, "02115"), /^Fight/);
    r = toTurn(commitDone(r), ROLAND);
    expect(lastTest(r)?.base).toBe(7);
    expect(enemies(gOf(r))[0].damage).toBe(3);
    expect(cardOf(r, flare).zone).toBe(ZONE.Removed);
  });

  it("Flare: an Ally from the top 9 cards of another investigator's deck into play under your control", () => {
    let cop = "";
    let r = game({
      investigators: [ROLAND, DAISY],
      prep: (g) => {
        hand(g, ROLAND, "02115");
        cop = createCard(g, BEAT_COP, ZONE.Limbo, DAISY);
        putOnTop(g, DAISY, [cop]);
      },
    });
    // no enemy to fight: the search is the only choice
    r = pick(play(r, "02115"), "Daisy Walker");
    r = toTurn(pick(r, "Beat Cop"), ROLAND);
    expect(cardOf(r, cop).zone).toBe(ZONE.Play);
    expect(cardOf(r, cop).controller).toBe(ROLAND);
    expect(cardOf(r, cop).owner).toBe(DAISY);
  });
});

describe("The Essex County Express", () => {
  it("Bandolier: a third hand slot, for a Weapon only", () => {
    let r = game({
      investigators: [ROLAND],
      prep: (g) => {
        inPlay(g, ROLAND, "02147");
        inPlay(g, ROLAND, "01016"); // .45 Automatic: Weapon
        inPlay(g, ROLAND, "01087"); // Flashlight
        hand(g, ROLAND, "01016");
      },
    });
    r = toTurn(play(r, "01016"), ROLAND);
    expect(controlled(gOf(r), ROLAND).filter((c) => c.code === "01016")).toHaveLength(2);
    expect(controlled(gOf(r), ROLAND).some((c) => c.code === "01087")).toBe(true);
  });

  it("Stand Together: you and another investigator here each draw 2 and gain 2 resources", () => {
    let r = game({
      investigators: [ROLAND, DAISY],
      prep: (g) => void hand(g, ROLAND, "02148"),
    });
    const me = { ...inv(gOf(r), ROLAND) };
    const her = { ...inv(gOf(r), DAISY) };
    r = toTurn(play(r, "02148"), ROLAND);
    expect(inv(gOf(r), ROLAND).hand.length).toBe(me.hand.length - 1 + 2);
    expect(inv(gOf(r), ROLAND).resources).toBe(me.resources + 2);
    expect(inv(gOf(r), DAISY).hand.length).toBe(her.hand.length + 2);
    expect(inv(gOf(r), DAISY).resources).toBe(her.resources + 2);
  });

  it("Stand Together can't be played alone", () => {
    const r = game({
      investigators: [ROLAND, DAISY],
      prep: (g) => {
        hand(g, ROLAND, "02148");
        placeInvestigator(g, DAISY, hallway(g));
      },
    });
    expect(options(r).some((o) => o.includes("Stand Together"))).toBe(false);
  });

  it("Art Student discovers 1 clue at your location as it enters play", () => {
    let r = game({
      investigators: [ROLAND],
      prep: (g) => {
        hand(g, ROLAND, "02149");
        setCounter(g, inv(g, ROLAND).location!, "clues", 2);
      },
    });
    r = toTurn(pick(play(r, "02149"), /^Art Student/), ROLAND);
    expect(inv(gOf(r), ROLAND).clues).toBe(1);
  });

  it("Deduction (2): 1 more clue on a success, 2 more by 2 or more", () => {
    const deduce = (token: "0" | "-2") => {
      let r = game({
        investigators: [ROLAND],
        bag: [token],
        prep: (g) => {
          hand(g, ROLAND, "02150");
          setCounter(g, inv(g, ROLAND).location!, "clues", 5);
        },
      });
      r = pick(r, "Investigate Study");
      r = toTurn(commitDone(pick(r, /^Commit Deduction/)), ROLAND);
      return inv(gOf(r), ROLAND).clues;
    };
    // intellect 3 + 2 icons = 5 against shroud 2: by 3 with a 0, by 1 with a -2
    expect(deduce("0")).toBe(3);
    expect(deduce("-2")).toBe(2);
  });

  it(`"I'm outta here!" is played only with a resign ability in play, and resigns`, () => {
    let r = game({ investigators: [ROLAND], prep: (g) => void hand(g, ROLAND, "02151") });
    expect(options(r).some((o) => o.includes("I'm outta here!"))).toBe(false);
    // the Miskatonic Quad (Extracurricular Activity) has a resign ability
    r = inject(r, (g) => void addLocation(g, "02048", [[STUDY, "02048"]]));
    r = play(r, "02151");
    expect(inv(gOf(r), ROLAND).status).toBe("resigned");
  });

  it("Switchblade (2): +2 combat, +1 damage when it succeeds by 2", () => {
    let r = game({
      investigators: [ROLAND],
      bag: ["0"],
      prep: (g) => {
        inPlay(g, ROLAND, "02152");
        enemyHere(g, ROLAND, RAVENOUS); // fight 3
      },
    });
    r = toTurn(use(r, "02152"), ROLAND);
    expect(lastTest(r)?.base).toBe(6);
    expect(enemies(gOf(r))[0].damage).toBe(2);
  });

  it("Hypnotic Gaze cancels the attack; a symbol deals the enemy's damage to itself", () => {
    let ravenous = "";
    let r = game({
      investigators: [ROLAND],
      bag: ["skull"],
      prep: (g) => {
        hand(g, ROLAND, "02153");
        ravenous = enemyHere(g, ROLAND, RAVENOUS);
      },
    });
    const before = { ...inv(gOf(r), ROLAND) };
    r = inject(r, () => {}, {
      t: STEP.EnemyAttack,
      enemy: ravenous,
      inv: ROLAND,
      aoo: false,
      key: "test-attack",
    });
    r = toTurn(pick(r, /Hypnotic Gaze/), ROLAND);
    expect(inv(gOf(r), ROLAND).damage).toBe(before.damage);
    expect(inv(gOf(r), ROLAND).horror).toBe(before.horror);
    expect(cardOf(r, ravenous).damage).toBe(1);
  });

  it("Shrivelling (3): willpower +2 and +1 damage; a symbol costs 1 horror", () => {
    let r = game({
      investigators: [ROLAND],
      bag: ["cultist"],
      prep: (g) => {
        inPlay(g, ROLAND, "02154");
        enemyHere(g, ROLAND, RAVENOUS);
      },
    });
    const horror = inv(gOf(r), ROLAND).horror;
    r = toTurn(use(r, "02154"), ROLAND);
    expect(lastTest(r)?.base).toBe(5);
    expect(enemies(gOf(r))[0].damage).toBe(2);
    expect(inv(gOf(r), ROLAND).horror).toBe(horror + 1);
  });

  it("Newspaper: +2 intellect while investigating with no clues", () => {
    let r = game({
      investigators: [ROLAND],
      bag: ["0"],
      prep: (g) => {
        inPlay(g, ROLAND, "02155");
        setCounter(g, inv(g, ROLAND).location!, "clues", 3);
      },
    });
    r = toTurn(investigate(r), ROLAND);
    expect(lastTest(r)?.base).toBe(5);
    r = toTurn(investigate(r), ROLAND);
    expect(lastTest(r)?.base).toBe(3);
  });

  it("Lure: the enemies that move in the enemy phase move toward it; discarded at the end of the round", () => {
    let lure = "";
    let rats = "";
    let r = game({
      investigators: [ROLAND],
      prep: (g) => {
        hallway(g);
        const attic = addLocation(g, ATTIC, [[HALLWAY, ATTIC]]);
        lure = hand(g, ROLAND, "02156");
        rats = putEnemy(g, RATS, locId(g, HALLWAY), null);
        void attic;
      },
    });
    r = toTurn(play(r, "02156"), ROLAND);
    expect(cardOf(r, lure).zone).toBe(ZONE.Attached);
    // Roland goes up to the Attic; the rats in the Hallway would follow him there
    r = inject(r, (g) => placeInvestigator(g, ROLAND, locId(g, ATTIC)));
    r = inject(r, (g) => (g.s.phase = "enemy"), { t: STEP.HunterMoves });
    expect(at(r, rats)).toBe(STUDY);
    r = inject(r, () => {}, { t: STEP.Window, trigger: "roundEnds", data: {} });
    expect(cardOf(r, lure).zone).toBe(ZONE.Discard);
  });

  it("Relic Hunter and Charisma: one more accessory slot, one more ally slot, in play from the start", () => {
    let r = game({
      investigators: [ROLAND],
      extra: {
        investigators: [{ code: ROLAND, deck: [...deckCodes("roland-starter"), "02157", "02158"] }],
      },
      prep: (g) => {
        inPlay(g, ROLAND, BEAT_COP);
        hand(g, ROLAND, "01117"); // Lita Chantler: an Ally
        setCounter(g, ROLAND, "resources", 9);
      },
    });
    const permanent = controlled(gOf(r), ROLAND).filter((c) => ["02157", "02158"].includes(c.code));
    expect(permanent.map((c) => c.zone)).toEqual([ZONE.Play, ZONE.Play]);
    r = toTurn(play(r, "01117"), ROLAND);
    expect(controlled(gOf(r), ROLAND).some((c) => c.code === BEAT_COP)).toBe(true);
    expect(controlled(gOf(r), ROLAND).some((c) => c.code === "01117")).toBe(true);
  });
});
