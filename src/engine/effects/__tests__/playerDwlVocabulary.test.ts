/** The vocabulary The Dunwich Legacy's player cards added (player-cards-dwl, task 1.1): one test per entry. */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../../content";
import type { Result } from "../../index";
import { addTempMod, checkCondition, controlled, enemies } from "../../queries";
import {
  attachTo,
  card,
  exhaust,
  inv,
  placeInvestigator,
  setCounter,
  type GameContext,
} from "../../context";
import { createCard } from "../../movement";
import {
  addLocation,
  enemyHere,
  game,
  inject,
  inPlay,
  lastTest,
  toTurn,
  until,
  windowOf,
} from "../../kits/driver";
import { gOf, options, pick, putEnemy } from "../../kits/testkit";
import { STEP } from "../../steps/step";
import { ZONE } from "../../world/constants";
import type { Effect } from "../../../content/schema";

beforeAll(() => loadPack("dwl"));

const R = "01001"; // Roland: willpower 3, intellect 3, combat 4, agility 2
const D = "01002"; // Daisy
const STUDY = "01111";
const HALLWAY = "01112"; // shroud 1
const MINION = "01160"; // Ghoul Minion: fight 2, health 2, evade 2
const RAVENOUS = "01161"; // Ravenous Ghoul: fight 3, health 3

/** the Study with the Hallway (1 clue) beside it */
const hallway = (game: GameContext) => {
  const id = addLocation(game, HALLWAY, [[STUDY, HALLWAY]]);
  setCounter(game, id, "clues", 1);
  return id;
};
/** one effect for `you`, with the source card given */
const eff = (r: Result, e: Effect, you = R, source: string | null = null) =>
  inject(r, () => {}, { t: STEP.Eff, effect: e, ctx: { you, source } });
const where = (r: Result, i: string) => card(gOf(r), inv(gOf(r), i).location!).code;

describe("fight, investigate and evade: baseSkill", () => {
  it("the skill's base value replaces the investigator's; modifiers still count", () => {
    let r = game({ investigators: [R], bag: ["0"], prep: (g) => void enemyHere(g, R, RAVENOUS) });
    r = toTurn(eff(r, { op: "fight", baseSkill: 1, bonus: 1 }), R);
    expect(lastTest(r)?.base).toBe(2);
    r = toTurn(eff(r, { op: "investigate", baseSkill: 6 }), R);
    expect(lastTest(r)?.base).toBe(6);
  });
});

describe("investigate: moveFirst", () => {
  it("you may move to a connecting location, then investigate there", () => {
    let r = game({ investigators: [R], bag: ["0"], prep: (g) => void hallway(g) });
    r = eff(r, { op: "investigate", moveFirst: "connecting" });
    expect(options(r)).toEqual(["Investigate here", "Hallway"]);
    r = toTurn(pick(r, "Hallway"), R);
    expect(where(r, R)).toBe(HALLWAY);
    expect(inv(gOf(r), R).clues).toBe(1);
  });
});

describe("investigate: extraClues", () => {
  it("a success discovers that many more clues", () => {
    let r = game({
      investigators: [R],
      bag: ["0"],
      prep: (g) => setCounter(g, inv(g, R).location!, "clues", 3),
    });
    r = toTurn(eff(r, { op: "investigate", extraClues: 1 }), R);
    expect(inv(gOf(r), R).clues).toBe(2);
  });
});

describe("fight: noDamageToOthersOnFail", () => {
  it("a failure against an enemy engaged with another investigator deals them nothing", () => {
    const failing = (noDamage: boolean) => {
      let r = game({
        investigators: [R, D],
        bag: ["autoFail"],
        prep: (g) => void putEnemy(g, MINION, inv(g, R).location!, D),
      });
      r = toTurn(eff(r, { op: "fight", ...(noDamage ? { noDamageToOthersOnFail: true } : {}) }), R);
      while (r.state.pending?.kind === "assign") r = pick(r, r.state.pending.options[0].label);
      return inv(gOf(toTurn(r, R)), D).damage;
    };
    expect(failing(false)).toBe(1);
    expect(failing(true)).toBe(0);
  });
});

describe("Cost actions", () => {
  it("is paid from the turn's actions", () => {
    let kukri = "";
    let r = game({
      investigators: [R],
      bag: ["0"],
      prep: (g) => {
        enemyHere(g, R, RAVENOUS);
        kukri = inPlay(g, R, "02036");
      },
    });
    r = eff(r, { op: "fight", boost: { cost: { actions: 1 }, damage: 1 } }, R, kukri);
    r = until(r, (x) => options(x).some((o) => o.startsWith("Use ")));
    const left = inv(gOf(r), R).actionsLeft;
    r = toTurn(pick(r, /^Use /), R);
    expect(inv(gOf(r), R).actionsLeft).toBe(left - 1);
    expect(enemies(gOf(r))[0].damage).toBe(2);
  });
});

describe("costX", () => {
  it("the player chooses X up to their resources: paid, and the asset's uses", () => {
    let r = game({
      investigators: [R],
      prep: (g) => {
        const id = createCard(g, "02010", ZONE.Hand, R);
        void id;
      },
    });
    const res = inv(gOf(r), R).resources;
    r = pick(r, /^Play Jenny's Twin/);
    expect(options(r)).toHaveLength(res + 1);
    r = pick(r, "X = 2");
    const twin = controlled(gOf(r), R).find((c) => c.code === "02010")!;
    expect(twin.uses).toBe(2);
    expect(inv(gOf(r), R).resources).toBe(res - 2);
  });
});

describe("InvTarget chooseAtOrConnecting", () => {
  it("offers the investigators at your location and at connecting ones", () => {
    let r = game({
      investigators: [R, D],
      prep: (g) => {
        placeInvestigator(g, D, hallway(g));
        setCounter(g, D, "horror", 1);
      },
    });
    r = eff(r, { op: "heal", horror: 1, target: "chooseAtOrConnecting" });
    expect(options(r)).toEqual(["Roland Banks", "Daisy Walker"]);
    r = pick(r, "Daisy Walker");
    expect(inv(gOf(r), D).horror).toBe(0);
  });
});

describe("discoverClues at connecting", () => {
  it("discovers at a connecting location with clues, not yours", () => {
    let hall = "";
    let r = game({
      investigators: [R],
      prep: (g) => {
        hall = hallway(g);
        setCounter(g, inv(g, R).location!, "clues", 2);
      },
    });
    r = toTurn(eff(r, { op: "discoverClues", amount: 1, at: "connecting" }), R);
    expect(card(gOf(r), hall).clues).toBe(0);
    expect(inv(gOf(r), R).clues).toBe(1);
  });
});

describe("moveTo target", () => {
  it("moves the investigator chosen, you choosing where", () => {
    let r = game({ investigators: [R, D], prep: (g) => void hallway(g) });
    r = toTurn(eff(r, { op: "moveTo", where: "connecting", target: "chooseOtherAtLocation" }), R);
    expect(where(r, D)).toBe(HALLWAY);
    expect(where(r, R)).toBe(STUDY);
  });
});

describe("forInvestigator", () => {
  it("resolves the effects with the chosen investigator as you", () => {
    let r = game({ investigators: [R, D], prep: (g) => setCounter(g, D, "horror", 2) });
    r = eff(r, {
      op: "forInvestigator",
      target: "chooseAtLocation",
      effects: [
        { op: "heal", horror: 1 },
        { op: "gainResources", amount: 2 },
      ],
    });
    const res = inv(gOf(r), D).resources;
    r = toTurn(pick(r, "Daisy Walker"), R);
    expect(inv(gOf(r), D).horror).toBe(1);
    expect(inv(gOf(r), D).resources).toBe(res + 2);
  });
});

describe("forceResult", () => {
  it("decides the test under way whatever its total", () => {
    // Roland's willpower 3 + 1 against 0, made to fail while its commit window is open
    let r = game({ investigators: [R], bag: ["+1"], prep: (g) => void inPlay(g, R, "01017") });
    r = eff(r, { op: "skillTest", skill: "willpower", difficulty: 0 });
    expect(r.state.pending?.kind).toBe("commit");
    r = eff(r, { op: "forceResult", result: "fail" });
    r = toTurn(r, R);
    expect(lastTest(r)?.success).toBe(false);
  });
});

describe("enemyWouldSpawn", () => {
  it("opens before the enemy enters play, which then spawns where it would", () => {
    let r = game({ investigators: [R] });
    const minion = createCard(gOf(r), MINION, ZONE.Limbo);
    r = inject(r, () => {}, { t: STEP.Spawn, enemy: minion, inv: R });
    // no one can react: the enemy spawns engaged with Roland
    expect(card(gOf(r), minion).engagedWith).toBe(R);
    expect(card(gOf(r), minion).location).toBe(inv(gOf(r), R).location);
  });
});

describe("moveEnemy", () => {
  it("moves the event's enemy to a location connecting to its own", () => {
    let minion = "";
    let r = game({
      investigators: [R],
      prep: (g) => {
        hallway(g);
        minion = enemyHere(g, R, MINION);
      },
    });
    r = toTurn(
      inject(r, () => {}, {
        t: STEP.Eff,
        effect: { op: "moveEnemy", to: "connecting" },
        ctx: { you: R, enemy: minion },
      }),
      R,
    );
    expect(card(gOf(r), card(gOf(r), minion).location!).code).toBe(HALLWAY);
    expect(card(gOf(r), minion).engagedWith).toBe(null);
  });
});

describe("exhaustCards", () => {
  it("exhausts every card you control that matches", () => {
    let flash = "";
    let r = game({ investigators: [R], prep: (g) => (flash = inPlay(g, R, "01087")) });
    r = toTurn(eff(r, { op: "exhaustCards", filter: { type: "asset" } }), R);
    expect(card(gOf(r), flash).exhausted).toBe(true);
  });
});

describe("modifiers: upkeepResources, startingResources, assetsCannotReady, skullIsZero", () => {
  it("upkeepResources: more resources in the upkeep", () => {
    let r = game({
      investigators: [R],
      prep: (g) => addTempMod(g, { stat: "upkeepResources", value: 2 }, R, "round"),
    });
    const res = inv(gOf(r), R).resources;
    r = inject(r, () => {}, { t: STEP.GainResource, inv: R });
    expect(inv(gOf(r), R).resources).toBe(res + 3);
  });

  it("startingResources: the investigator starts with fewer (Indebted, Permanent)", () => {
    const r = game({
      investigators: [R],
      extra: {
        investigators: [{ code: R, deck: ["02037", "01088", "01088", "01088", "01088", "01088"] }],
      },
    });
    expect(inv(gOf(r), R).resources).toBe(3);
  });

  it("assetsCannotReady: the investigator's assets stay exhausted", () => {
    let flash = "";
    let r = game({
      investigators: [R],
      prep: (g) => {
        flash = inPlay(g, R, "01087");
        exhaust(g, flash);
        addTempMod(g, { flag: "assetsCannotReady" }, R, "round");
      },
    });
    r = inject(r, () => {}, { t: STEP.ReadyAll });
    expect(card(gOf(r), flash).exhausted).toBe(true);
  });

  it("skullIsZero: the skull's modifier is 0", () => {
    let r = game({
      investigators: [R],
      bag: ["skull"],
      prep: (g) => {
        enemyHere(g, R, MINION);
        addTempMod(g, { flag: "skullIsZero" }, R, "round");
      },
    });
    r = toTurn(eff(r, { op: "skillTest", skill: "willpower", difficulty: 1 }), R);
    expect(lastTest(r)?.total).toBe(3);
  });
});

describe("onTokens after", () => {
  it("resolves once the test has ended", () => {
    let r = game({ investigators: [R], bag: ["skull"] });
    r = eff(r, {
      op: "investigate",
      onTokens: { tokens: ["skull"], after: true, effects: [{ op: "gainResources", amount: 1 }] },
    });
    const res = inv(gOf(r), R).resources;
    r = toTurn(r, R);
    expect(inv(gOf(r), R).resources).toBe(res + 1);
    expect(gOf(r).s.skillTest).toBe(null);
  });
});

describe("conditions testSourceIsSelf and selfHasHorror", () => {
  it("testSourceIsSelf holds while the card's own test is under way", () => {
    const g = gOf(game({ investigators: [R] }));
    const axe = inPlay(g, R, "02032");
    expect(checkCondition(g, { testSourceIsSelf: true }, { you: R, source: axe })).toBe(false);
  });

  it("selfHasHorror reads the horror on the card", () => {
    const g = gOf(game({ investigators: [R] }));
    const peter = inPlay(g, R, "02033");
    expect(checkCondition(g, { selfHasHorror: true }, { source: peter })).toBe(false);
    setCounter(g, peter, "horror", 1);
    expect(checkCondition(g, { selfHasHorror: true }, { source: peter })).toBe(true);
  });
});

describe("enemyWouldReady and upkeepPhaseEnds", () => {
  it("open in the upkeep phase: before an exhausted enemy readies, and after hand sizes", () => {
    let r = game({
      investigators: [R],
      prep: (g) => {
        const minion = enemyHere(g, R, MINION, false);
        exhaust(g, minion);
        const bind = createCard(g, "02031", ZONE.Attached, R);
        attachTo(g, bind, minion);
        inPlay(g, R, "02027"); // Hired Muscle
      },
    });
    r = inject(r, () => {}, { t: STEP.UpkeepPhase });
    r = until(r, (x) => windowOf(x) === "enemyWouldReady");
    expect(options(r).some((o) => o.startsWith("Bind Monster"))).toBe(true);
    r = until(r, (x) => options(x).includes("Pay 1 resource"));
    expect(r.state.phase).toBe("upkeep");
  });
});
