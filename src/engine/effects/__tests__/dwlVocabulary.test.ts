/** The vocabulary The Dunwich Legacy's first scenario added (campaign-the-dunwich-legacy, task 1.2): one test per entry. */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../../content";
import type { Result } from "../../index";
import { checkLog } from "../../index";
import { addCounter, card, inv, setController, setCounter, type GameContext } from "../../context";
import { createCard, link, moveCard } from "../../movement";
import { addTempMod, checkCondition, enemyStat, findByCode, spawnTargets } from "../../queries";
import { amt } from "../targets";
import { game, inject, inPlay, lastTest, move, toTurn, until, use } from "../../kits/driver";
import { gOf, options, pick, putEnemy } from "../../kits/testkit";
import { ZONE } from "../../world/constants";
import { STEP } from "../../steps/step";
import type { Effect } from "../../../content/schema";

beforeAll(async () => {
  await loadPack("dwl");
});

const R = "01001"; // Roland: willpower 3, intellect 3, combat 4, agility 2
const EA = "extracurricular-activity";
const at = (code: string) => (game: GameContext) => findByCode(game, code, [ZONE.Location])!.id;

/** Roland at the Miskatonic Quad, a bag of zeros, `prep` applied */
const quad = (
  prep: (game: GameContext) => void = () => {},
  bag: Parameters<typeof game>[0]["bag"] = ["0"],
) =>
  game({
    scenario: EA,
    investigators: [R],
    bag,
    prep,
    extra: { campaignId: "the-dunwich-legacy" },
  });

/** run one effect for Roland, answering neutrally until his next action */
const effect = (r: Result, e: Effect) =>
  toTurn(
    inject(r, () => {}, { t: STEP.Eff, effect: e, ctx: { you: R, source: null } }),
    R,
  );

const deckSize = (r: Result) => inv(gOf(r), R).deck.length;
const discardSize = (r: Result) => inv(gOf(r), R).discard.length;

describe("discardDeckTop", () => {
  it("discards a fixed number of cards from the top of the deck", () => {
    const r = quad();
    const top = inv(gOf(r), R).deck.slice(0, 3);
    const after = effect(r, { op: "discardDeckTop", amount: 3 });
    expect(deckSize(after)).toBe(deckSize(r) - 3);
    expect(inv(gOf(after), R).discard.slice(-3)).toEqual(top);
  });

  it('"failBy": one card per point the test failed by', () => {
    const r = quad();
    const after = effect(r, {
      op: "skillTest",
      skill: "willpower",
      difficulty: 6,
      onFail: [{ op: "discardDeckTop", amount: "failBy" }],
    });
    expect(lastTest(after)?.success).toBe(false);
    expect(discardSize(after) - discardSize(r)).toBe(3);
  });

  it("an emptied deck opens the deckEmptied window (Beyond the Veil's 10 damage)", () => {
    const r = quad((g) => {
      for (const id of inv(g, R).deck.slice(2)) moveCard(g, id, ZONE.Discard);
      const veil = createCard(g, "02084", ZONE.Limbo);
      moveCard(g, veil, ZONE.Threat);
      setController(g, veil, R);
    });
    const after = effect(r, { op: "discardDeckTop", amount: 5 });
    expect(deckSize(after)).toBe(0);
    expect(inv(gOf(after), R).status).not.toBe("playing");
  });
});

describe("Amount onYou", () => {
  it("is the damage (or horror, clues, resources) on you, plus a number", () => {
    const g = gOf(quad());
    setCounter(g, R, "damage", 3);
    addCounter(g, R, "horror", 1);
    expect(amt(g, { onYou: "damage", plus: 2 }, { you: R })).toBe(5);
    expect(amt(g, { onYou: "horror" }, { you: R })).toBe(1);
  });

  it("sets a skill test's difficulty (Eager for Death)", () => {
    const r = quad((g) => setCounter(g, R, "damage", 2));
    const after = effect(r, {
      op: "skillTest",
      skill: "willpower",
      difficulty: { onYou: "damage", plus: 2 },
    });
    expect(lastTest(after)?.difficulty).toBe(4);
  });
});

describe("conditions", () => {
  it("discardPile counts your discard pile; testSkill names the skill tested", () => {
    const g = gOf(quad());
    expect(checkCondition(g, { discardPile: { min: 1 } }, { you: R })).toBe(false);
    for (const id of inv(g, R).deck.slice(0, 10)) moveCard(g, id, ZONE.Discard);
    expect(checkCondition(g, { discardPile: { min: 10 } }, { you: R })).toBe(true);
    expect(checkCondition(g, { testSkill: "willpower" }, { you: R })).toBe(false);
  });

  it('LogCondition "any": one of several log entries', () => {
    const any = { any: [{ logHas: "a" }, { logHas: "b" }] };
    expect(checkLog({ b: true }, any, 1)).toBe(true);
    expect(checkLog({}, any, 1)).toBe(false);
  });
});

describe("movement: wouldMoveIn and cannotLeave", () => {
  it("a forced ability of a card attached to the destination runs before the move, and can cancel it", () => {
    const r = quad((g) => {
      const barrier = createCard(g, "02102", ZONE.Attached);
      moveCard(g, barrier, ZONE.Attached, { location: at("02050")(g) });
    });
    const tried = until(
      move(r, "02050"),
      (x) => x.state.pending?.kind === "turn" || /Cancel/.test(options(x).join()),
    );
    const stay = pick(tried, /Cancel the move/);
    expect(inv(gOf(toTurn(stay, R)), R).location).toBe(at("02048")(gOf(r)));
  });

  it("cannotLeave: no move is offered out of the location", () => {
    const r = quad((g) => addTempMod(g, { flag: "cannotLeave" }, at("02048")(g), "round"));
    expect(options(r).some((o) => o.startsWith("Move"))).toBe(false);
  });
});

describe("spawn: mostClues and farthest", () => {
  it("narrows the locations to those with the most clues, or the farthest from you", () => {
    const g = gOf(quad());
    setCounter(g, at("02053")(g), "clues", 5);
    expect(spawnTargets(g, { mostClues: true }, null)).toEqual([at("02053")(g)]);
    const far = createCard(g, "02052", ZONE.Limbo);
    moveCard(g, far, ZONE.Location);
    link(g, far, at("02051")(g));
    expect(spawnTargets(g, { farthest: true, to: "you" }, at("02048")(g))).toEqual([far]);
  });
});

describe("a fight modifier by the attacking card (Avian Thrall)", () => {
  it("applies only while the enemy is attacked with a matching asset", () => {
    let thrall = "";
    const r = quad((g) => {
      thrall = putEnemy(g, "02094", inv(g, R).location!, R);
      inPlay(g, R, "01016"); // .45 Automatic: Item. Weapon. Firearm.
    });
    expect(enemyStat(gOf(r), thrall, "fight")).toBe(5);
    const shot = until(use(r, "01016"), (x) => x.state.pending?.kind === "turn");
    expect(lastTest(shot)?.difficulty).toBe(2);
  });
});

describe("enemyFought and discardEventCard (Conglomeration of Spheres)", () => {
  it("the Melee card an attack was performed with is discarded after it", () => {
    let machete = "";
    const r = quad((g) => {
      putEnemy(g, "02103", inv(g, R).location!, R);
      machete = inPlay(g, R, "01020");
    });
    const after = toTurn(use(r, "01020"), R);
    expect(card(gOf(after), machete).zone).toBe(ZONE.Discard);
  });
});

describe("flags", () => {
  it("cannotGainResourcesWhileEngaged: the engaged investigator's resource action gains nothing", () => {
    const r = quad((g) => putEnemy(g, "02097", inv(g, R).location!, R));
    const before = inv(gOf(r), R).resources;
    const after = pick(r, /resource/i);
    expect(inv(gOf(after), R).resources).toBe(before);
  });

  it("directDamage: damage dealt to the investigator skips the assets that could take it", () => {
    let dog = "";
    const r = quad((g) => {
      dog = inPlay(g, R, "01021"); // Guard Dog
      addTempMod(g, { flag: "directDamage" }, R, "round");
    });
    const after = toTurn(
      inject(r, () => {}, {
        t: STEP.AssignDamage,
        inv: R,
        damage: 1,
        horror: 0,
        direct: false,
        source: null,
      }),
      R,
    );
    expect(inv(gOf(after), R).damage).toBe(1);
    expect(card(gOf(after), dog).damage).toBe(0);
  });
});
