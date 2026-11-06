/** The vocabulary The Path to Carcosa's player cards added (player-cards-ptc, task 1.1): one test per entry. */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../../content";
import type { Result } from "../../index";
import {
  addTempMod,
  checkCondition,
  controlled,
  enemies,
  isAloof,
  matchesFilter,
} from "../../queries";
import { card, inv, placeInvestigator, setCounter, type GameContext } from "../../context";
import { createCard, moveCard } from "../../movement";
import {
  addLocation,
  enemyHere,
  game,
  hand,
  inject,
  inPlay,
  lastTest,
  toTurn,
  until,
  windowData,
  windowOf,
} from "../../kits/driver";
import { gOf, options, pick, putEnemy } from "../../kits/testkit";
import { STEP } from "../../steps/step";
import { ZONE } from "../../world/constants";
import { gainedIcons, role } from "../../world/flags";
import { amt } from "../targets";
import type { Effect } from "../../../content/schema";

beforeAll(() => loadPack("ptc"));

const R = "01001"; // Roland: willpower 3, intellect 3, combat 4, agility 2
const D = "01002"; // Daisy
const STUDY = "01111";
const HALLWAY = "01112"; // shroud 1
const ATTIC = "01113";
const MINION = "01160"; // Ghoul Minion: fight 2, health 2, evade 2
const GUTS = "01089"; // skill: 2 willpower

/** the Study with the Hallway (1 clue) beside it */
const hallway = (game: GameContext) => {
  const id = addLocation(game, HALLWAY, [[STUDY, HALLWAY]]);
  setCounter(game, id, "clues", 1);
  return id;
};
/** one effect for `you`, with the context given */
const eff = (r: Result, e: Effect, you = R, ctx: Record<string, unknown> = {}) =>
  inject(r, () => {}, { t: STEP.Eff, effect: e, ctx: { you, source: null, ...ctx } });
const where = (r: Result, i: string) => card(gOf(r), inv(gOf(r), i).location!).code;
const test = (skill: "willpower" | "intellect", difficulty: number): Effect => ({
  op: "skillTest",
  skill,
  difficulty,
});

describe("Amount onYou per, atMost", () => {
  it("one per 2 damage on you, rounded down (Shell Shock)", () => {
    const r = game({ investigators: [R], prep: (g) => setCounter(g, R, "damage", 5) });
    expect(amt(gOf(r), { onYou: "damage", per: 2 }, { you: R })).toBe(2);
  });
  it("an amount capped (Alchemical Transmutation: the margin, at most 3)", () => {
    const r = game({ investigators: [R] });
    expect(amt(gOf(r), { atMost: 3, of: "succeedBy" }, { you: R, succeedBy: 5 })).toBe(3);
    expect(amt(gOf(r), { atMost: 3, of: "succeedBy" }, { you: R, succeedBy: 2 })).toBe(2);
  });
});

describe("flag commitFromAfar, the cardCommitted and cardsCommitted windows", () => {
  it("an investigator elsewhere commits 1 card; the windows carry the card and how many", () => {
    let r = game({
      investigators: [R, D],
      bag: ["0"],
      prep: (g) => {
        placeInvestigator(g, D, hallway(g));
        addTempMod(g, { flag: "commitFromAfar" }, D, "round");
        hand(g, D, GUTS);
        hand(g, D, GUTS);
        // a listener for both windows, so they are offered
        inPlay(g, D, "03010");
      },
    });
    r = eff(r, test("willpower", 2));
    r = until(r, (x) => x.state.pending?.inv === D && x.state.pending.kind === "commit");
    r = pick(r, /^Commit Guts/);
    expect(windowOf(r) ?? "cardCommitted").toBe("cardCommitted");
    r = until(r, (x) => x.state.pending?.inv === D && x.state.pending.kind === "commit");
    // one card only from another location
    expect(options(r).filter((o) => o.startsWith("Commit"))).toEqual([]);
    r = pick(r, /^Done/);
    expect(windowOf(r)).toBe("cardsCommitted");
    expect(windowData(r)?.amount).toBe(1);
  });
});

describe("condition eventAmount", () => {
  it("holds when the event's amount is within the bounds", () => {
    const r = game({ investigators: [R] });
    const c = { eventAmount: { min: 1, max: 1 } } as const;
    expect(checkCondition(gOf(r), c, { you: R, x: 1 })).toBe(true);
    expect(checkCondition(gOf(r), c, { you: R, x: 2 })).toBe(false);
  });
});

describe("cardGainsIcons", () => {
  it("the committed card gains the icons until the end of the test", () => {
    let guts = "";
    let r = game({ investigators: [R], bag: ["0"], prep: (g) => void (guts = hand(g, R, GUTS)) });
    r = eff(r, test("willpower", 9));
    r = until(r, (x) => x.state.pending?.kind === "commit");
    r = pick(r, /^Commit Guts/);
    r = inject(r, () => {}, {
      t: STEP.Eff,
      effect: { op: "cardGainsIcons", icons: { wild: 1 } },
      ctx: { you: R, card: guts },
    });
    expect(gainedIcons.get(gOf(r), guts)).toEqual({ wild: 1 });
    r = toTurn(r, R);
    // willpower 3, Guts 2, the wild icon 1
    expect(lastTest(r)?.total).toBe(3 + 2 + 1);
    expect(gainedIcons.get(gOf(r), guts)).toBeUndefined();
  });
});

describe("toVictory and the defeated enemy's location", () => {
  it("the event's enemy, defeated, goes to the victory display; the window says where it was", () => {
    let r = game({ investigators: [R], prep: (g) => void enemyHere(g, R, MINION) });
    const ghoul = enemies(gOf(r))[0].id;
    const study = inv(gOf(r), R).location;
    r = inject(r, () => {}, { t: STEP.DefeatEnemy, enemy: ghoul, by: R });
    r = toTurn(eff(r, { op: "toVictory" }, R, { enemy: ghoul }), R);
    expect(card(gOf(r), ghoul).zone).toBe(ZONE.Victory);
    // the window data: checked through the condition Bury Them Deep uses
    expect(checkCondition(gOf(r), { eventFromYourLocation: true }, { you: R, from: study })).toBe(
      true,
    );
  });
});

describe("flag cardsCannotLeaveDiscard", () => {
  it("while an enemy with it is engaged with you, nothing comes back from your discard pile", () => {
    let r = game({
      investigators: [R],
      prep: (g) => {
        const c = hand(g, R, GUTS);
        moveCard(g, c, ZONE.Discard);
        const e = enemyHere(g, R, MINION);
        addTempMod(g, { flag: "cardsCannotLeaveDiscard" }, e, "round");
      },
    });
    const n = inv(gOf(r), R).hand.length;
    r = toTurn(eff(r, { op: "takeFromDiscard", filter: {} }), R);
    expect(inv(gOf(r), R).hand.length).toBe(n);
  });
});

describe("modify next: test", () => {
  it("the bonus is spent by your next skill test", () => {
    let r = game({ investigators: [R], bag: ["0"] });
    r = toTurn(
      eff(r, { op: "modify", mod: { stat: "testValue", value: 2 }, until: "phase", next: "test" }),
      R,
    );
    r = toTurn(eff(r, test("willpower", 1)), R);
    expect(lastTest(r)?.total).toBe(5);
    r = toTurn(eff(r, test("willpower", 1)), R);
    expect(lastTest(r)?.total).toBe(3);
  });
});

describe("investigate at anyRevealed, moveTo anyRevealed", () => {
  it("investigates a revealed location that doesn't connect to yours", () => {
    let attic = "";
    let r = game({
      investigators: [R],
      bag: ["0"],
      prep: (g) => {
        hallway(g);
        attic = addLocation(g, ATTIC, [[HALLWAY, ATTIC]]);
        setCounter(g, attic, "clues", 2);
      },
    });
    r = eff(r, { op: "investigate", at: "anyRevealed" });
    r = toTurn(pick(r, "Attic"), R);
    expect(card(gOf(r), attic).clues).toBe(1);
    expect(where(r, R)).toBe(STUDY);
  });
  it("moves to a revealed location anywhere", () => {
    let r = game({
      investigators: [R],
      prep: (g) => {
        hallway(g);
        addLocation(g, ATTIC, [[HALLWAY, ATTIC]]);
      },
    });
    r = eff(r, { op: "moveTo", where: "anyRevealed" });
    r = toTurn(pick(r, "Attic"), R);
    expect(where(r, R)).toBe(ATTIC);
  });
});

describe("evade noExhaust, cannotEngageYou", () => {
  it("disengages without exhausting, and the enemy can't engage you this turn", () => {
    let r = game({ investigators: [R], bag: ["0"], prep: (g) => void enemyHere(g, R, MINION) });
    r = toTurn(eff(r, { op: "evade", noExhaust: true, cannotEngageYou: true }), R);
    const ghoul = enemies(gOf(r))[0];
    expect(ghoul.exhausted).toBe(false);
    expect(ghoul.engagedWith).toBeNull();
    // an action later in the turn: still not engaged
    r = toTurn(pick(r, /^Gain 1 resource/), R);
    expect(enemies(gOf(r))[0].engagedWith).toBeNull();
  });
});

describe("skillTest onTokens", () => {
  it("effects when one of the tokens is revealed", () => {
    let r = game({ investigators: [R], bag: ["skull"] });
    r = eff(r, {
      ...test("willpower", 1),
      onTokens: { tokens: ["skull"], effects: [{ op: "gainResources", amount: 3 }] },
    } as Effect);
    const res = inv(gOf(r), R).resources;
    r = toTurn(r, R);
    expect(inv(gOf(r), R).resources).toBe(res + 3);
  });
});

describe("discardAsset filter", () => {
  it("only an asset matching it; none: orElse", () => {
    let r = game({ investigators: [R], prep: (g) => void inPlay(g, R, "01021") }); // Guard Dog (Ally)
    r = toTurn(
      eff(r, {
        op: "discardAsset",
        filter: { trait: "Item" },
        orElse: [{ op: "gainResources", amount: 1 }],
      }),
      R,
    );
    expect(inv(gOf(r), R).discard.some((c) => card(gOf(r), c).code === "01021")).toBe(false);
  });
});

describe("attachToLocation any, a keyword granted to some enemies, enemyAtThisLocation", () => {
  it("the attachment gives the non-Elite enemies there aloof; it sees a ready enemy there", () => {
    let spot = "";
    let r = game({
      investigators: [R],
      prep: (g) => {
        hallway(g);
        spot = createCard(g, "03038", ZONE.Limbo, R);
        moveCard(g, spot, ZONE.Resolving);
      },
    });
    r = eff(r, { op: "attachToLocation", where: "any" }, R, { source: spot });
    r = pick(r, "Hallway");
    const hall = card(gOf(r), spot).location!;
    r = inject(r, (g) => void putEnemy(g, MINION, hall));
    const ghoul = enemies(gOf(r))[0].id;
    expect(isAloof(gOf(r), ghoul)).toBe(true);
    expect(
      checkCondition(gOf(r), { enemyAtThisLocation: { exhausted: false } }, { source: spot }),
    ).toBe(true);
  });
});

describe("CardFilter notName", () => {
  it("leaves out the cards of that title", () => {
    const g = gOf(game({ investigators: [R] }));
    expect(matchesFilter(g, "03039", { faction: "survivor" })).toBe(true);
    expect(matchesFilter(g, "03039", { faction: "survivor", notName: "Resourceful" })).toBe(false);
  });
});

describe("condition damage", () => {
  it("the damage on you, within the bounds (Sophie)", () => {
    const g = gOf(game({ investigators: [R], prep: (x) => setCounter(x, R, "damage", 5) }));
    expect(checkCondition(g, { damage: { min: 5 } }, { you: R })).toBe(true);
    expect(checkCondition(g, { damage: { max: 4 } }, { you: R })).toBe(false);
  });
});

describe("addUses yours", () => {
  it("only an asset you control", () => {
    let mine = "";
    let theirs = "";
    let r = game({
      investigators: [R, D],
      prep: (g) => {
        mine = inPlay(g, R, "01060"); // Shrivelling: 4 charges
        theirs = inPlay(g, D, "01060");
      },
    });
    r = toTurn(
      eff(r, {
        op: "addUses",
        amount: 1,
        usesType: ["charges"],
        filter: { type: "asset" },
        yours: true,
      }),
      R,
    );
    expect(card(gOf(r), mine).uses).toBe(5);
    expect(card(gOf(r), theirs).uses).toBe(4);
  });
});

describe("ModStat extraCharges", () => {
  it("an asset with uses (charges) enters play with that many more", () => {
    let r = game({
      investigators: [R],
      prep: (g) => {
        addTempMod(g, { stat: "extraCharges", value: 1 }, R, "round");
        hand(g, R, "01060");
        setCounter(g, R, "resources", 9);
      },
    });
    r = toTurn(pick(r, /^Play Shrivelling/), R);
    expect(controlled(gOf(r), R).find((c) => c.code === "01060")?.uses).toBe(5);
  });
});

describe("returnCommittedSkill anyOwner, afterTest, optional", () => {
  it("another's committed skill goes back to its owner's hand once the test ends", () => {
    let guts = "";
    let r = game({
      investigators: [R, D],
      bag: ["0"],
      prep: (g) => void (guts = hand(g, D, GUTS)),
    });
    r = eff(r, test("willpower", 1));
    r = until(r, (x) => x.state.pending?.inv === D && x.state.pending.kind === "commit");
    r = pick(r, /^Commit Guts/);
    r = until(r, (x) => x.state.pending?.inv === D && x.state.pending.kind === "commit");
    r = inject(r, () => {}, {
      t: STEP.Eff,
      effect: { op: "returnCommittedSkill", anyOwner: true, afterTest: true, optional: true },
      ctx: { you: R },
    });
    expect(options(r)).toEqual(["Guts", "Return none"]);
    r = pick(r, "Guts");
    // still committed: its icons count
    expect(card(gOf(r), guts).zone).toBe(ZONE.Commit);
    r = toTurn(pick(r, /^Done/), R);
    expect(card(gOf(r), guts).zone).toBe(ZONE.Hand);
    expect(inv(gOf(r), D).hand).toContain(guts);
  });
});

describe("Lola's role (offRole)", () => {
  it("only Neutral cards and cards of the role are playable; with no role, any", () => {
    let r = game({
      investigators: [R],
      prep: (g) => {
        hand(g, R, "01020"); // Machete (Guardian)
        hand(g, R, "01087"); // Flashlight (Neutral)
        setCounter(g, R, "resources", 9);
      },
    });
    expect(options(r).some((o) => o.startsWith("Play Machete"))).toBe(true);
    r = inject(r, (g) => role.set(g, R, "rogue"));
    expect(options(r).some((o) => o.startsWith("Play Machete"))).toBe(false);
    expect(options(r).some((o) => o.startsWith("Play Flashlight"))).toBe(true);
  });
});

describe("cannotCommitOneOrTwo", () => {
  it("no Done with 1 or 2 cards committed", () => {
    let r = game({
      investigators: [R],
      bag: ["0"],
      prep: (g) => {
        addTempMod(g, { flag: "cannotCommitOneOrTwo" }, R, "round");
        hand(g, R, GUTS);
      },
    });
    r = eff(r, test("willpower", 1));
    r = until(r, (x) => x.state.pending?.kind === "commit");
    r = pick(r, /^Commit Guts/);
    r = until(r, (x) => x.state.pending?.kind === "commit");
    expect(options(r).some((o) => o.startsWith("Done"))).toBe(false);
    expect(options(r).some((o) => o.startsWith("Take back"))).toBe(true);
  });
});

describe("modify next: play", () => {
  it("a cost reduction is spent by the next card it applies to", () => {
    let r = game({
      investigators: [R],
      prep: (g) => {
        hand(g, R, "01087");
        hand(g, R, "01087");
        setCounter(g, R, "resources", 5);
        addTempMod(g, { stat: "cost", value: -2 }, R, "turn", null, false, "play");
      },
    });
    r = toTurn(pick(r, /^Play Flashlight/), R);
    expect(inv(gOf(r), R).resources).toBe(5);
    r = toTurn(pick(r, /^Play Flashlight/), R);
    expect(inv(gOf(r), R).resources).toBe(3);
  });
});
