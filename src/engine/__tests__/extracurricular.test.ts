/** Extracurricular Activity (campaign-the-dunwich-legacy, group 1): setup, tokens, map, cards and resolutions. */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import type { ChaosToken, Difficulty } from "../../content/schema";
import { dispatch, type Result } from "../index";
import { next } from "../world/rng";
import { db, gOf, mutate, options, pick, putEnemy } from "../kits/testkit";
import { game, inject, inPlay, lastTest, move, toTurn, until, use } from "../kits/driver";
import {
  abilitiesOf,
  addTempMod,
  connections,
  enemies,
  enemyStat,
  findByCode,
  skillValue,
  threatArea,
} from "../queries";
import { canPlay } from "../rules/cards";
import {
  addCounter,
  card,
  exhaust,
  placeInvestigator,
  reveal,
  setCardLocation,
  setPhase,
  cardsBeneath,
  currentAct,
  currentAgenda,
  def,
  inv,
  pile,
  setController,
  setCounter,
  type GameContext,
} from "../context";
import { createCard, moveCard, putBeneath } from "../movement";
import { handLimit } from "../rules/investigators";
import { ZONE } from "../world/constants";
import { STEP } from "../steps/step";
import type { Step } from "../world/types";

beforeAll(async () => {
  await loadPack("dwl");
});

const R = "01001"; // Roland: willpower 3, intellect 3, combat 4, agility 2; health 9
const D = "01002"; // Daisy
const THAW = { francisMorganKidnapped: true };

interface Opts {
  invs?: string[];
  log?: Record<string, unknown>;
  bag?: ChaosToken[];
  difficulty?: Difficulty;
  prep?: (game: GameContext) => void;
}
/** Extracurricular Activity at its first turn: Roland alone, the bag a single 0 */
const ea = ({ invs = [R], log = {}, bag = ["0"], difficulty = "standard", prep }: Opts = {}) =>
  game({
    scenario: "extracurricular-activity",
    investigators: invs,
    bag,
    prep,
    extra: { campaignId: "the-dunwich-legacy", campaignLog: log, difficulty },
  });

const loc = (game: GameContext, code: string) => findByCode(game, code, [ZONE.Location])?.id;
const where = (r: Result, code: string) => findByCode(gOf(r), code)?.zone;
const at = (r: Result) => card(gOf(r), inv(gOf(r), R).location!).code;
/** a card of this code put into play as a location, revealed or not */
const place = (game: GameContext, code: string, revealed = false) => {
  const c = findByCode(game, code, [ZONE.SetAside]) ?? { id: createCard(game, code, ZONE.Limbo) };
  moveCard(game, c.id, ZONE.Location);
  if (revealed) reveal(game, c.id);
  return c.id;
};
/** run steps (first first), then answer neutrally until Roland chooses an action again */
const run = (r: Result, ...steps: Step[]) =>
  toTurn(
    inject(r, () => {}, ...steps),
    R,
  );
/** Roland draws this encounter card */
function draw(r: Result, code: string, who = R): Result {
  let id = "";
  const made = mutate(r, (g) => {
    id = createCard(g, code, ZONE.EncounterDeck);
  });
  return inject(made, () => {}, { t: STEP.DrawEncounter, inv: who, card: id });
}
const resolution = (r: Result) => r.state.resolution;
const toEnd = (r: Result) => until(r, () => false, 200);

// ---------- 1.3 setup ----------
describe("setup", () => {
  it("the campus in play, everyone at the Quad, Night is Still Young set aside when it is the first scenario", () => {
    const r = ea({ invs: [R, D] });
    const g = gOf(r);
    expect(["02048", "02049", "02050", "02051", "02053", "02056"].every((c) => loc(g, c))).toBe(
      true,
    );
    expect(inv(g, R).location).toBe(loc(g, "02048"));
    expect(inv(g, D).location).toBe(loc(g, "02048"));
    for (const c of ["02052", "02054", "02057", "02058", "02059", "02060", "02061"])
      expect(where(r, c)).toBe(ZONE.SetAside);
    expect(where(r, "02055")).toBe(ZONE.Removed);
    expect(pile(g, ZONE.EncounterDeck).some((id) => card(g, id).code === "02060")).toBe(false);
  });

  it("after The House Always Wins: The Hour is Late set aside, The Night is Still Young removed", () => {
    const r = ea({ log: THAW });
    expect(where(r, "02055")).toBe(ZONE.SetAside);
    expect(where(r, "02054")).toBe(ZONE.Removed);
  });
});

// ---------- 1.4 tokens ----------
/** Roland tests willpower against `difficulty` with one token in the bag */
function testWith(token: ChaosToken, opts: Opts = {}, difficulty = 0) {
  const r = ea({ ...opts, bag: [token] });
  const after = run(r, {
    t: STEP.Eff,
    effect: { op: "skillTest", skill: "willpower", difficulty },
    ctx: { you: R, source: null },
  });
  const ev = after.state.log.findLast((e) => e.type === "testResult")!;
  return { before: r, after, mods: (ev.data as { tokenMods: number[] }).tokenMods };
}

describe("chaos tokens", () => {
  for (const [d, skull, top, cultist, things] of [
    ["easy", -1, 3, -3, 2],
    ["standard", -1, 3, -3, 2],
    ["hard", -2, 5, -5, 3],
    ["expert", -2, 5, -5, 3],
  ] as const) {
    it(`${d}: skull ${skull}, a failure discards the top ${top}`, () => {
      const { before, after, mods } = testWith("skull", { difficulty: d }, 10);
      expect(mods).toEqual([skull]);
      expect(inv(gOf(after), R).discard.length - inv(gOf(before), R).discard.length).toBe(top);
    });

    it(`${d}: cultist −1, ${cultist} with 10 or more cards in the discard pile`, () => {
      expect(testWith("cultist", { difficulty: d }).mods).toEqual([-1]);
      const full = testWith("cultist", {
        difficulty: d,
        prep: (g) => {
          for (const id of inv(g, R).deck.slice(0, 10)) moveCard(g, id, ZONE.Discard);
        },
      });
      expect(full.mods).toEqual([cultist]);
    });

    it(`${d}: elder thing −X, X the printed cost of the top ${things} cards, discarded`, () => {
      const r = ea({ difficulty: d, bag: ["elderThing"] });
      const g = gOf(r);
      const top = inv(g, R).deck.slice(0, things);
      const cost = top.reduce((n, id) => {
        const c = def(g, id).cost;
        return n + (typeof c === "number" ? c : 0);
      }, 0);
      const { after, mods } = testWith("elderThing", { difficulty: d });
      expect(mods).toEqual([-cost]);
      expect(inv(gOf(after), R).discard.slice(-things)).toEqual(top);
    });
  }
});

// ---------- 1.5 connections ----------
describe("connections", () => {
  it("as the card scans print them", () => {
    const r = ea({
      prep: (g) => {
        for (const c of ["02052", "02054", "02057"]) place(g, c);
      },
    });
    const g = gOf(r);
    const links = (code: string) =>
      connections(g, loc(g, code)!)
        .map((id) => card(g, id).code)
        .sort();
    expect(links("02048")).toEqual(["02049", "02050", "02051", "02053", "02056"]);
    expect(links("02049")).toEqual(["02048", "02050"]);
    expect(links("02050")).toEqual(["02048", "02049"]);
    expect(links("02051")).toEqual(["02048", "02052"]);
    expect(links("02052")).toEqual(["02051"]);
    expect(links("02053")).toEqual(["02048", "02054"]);
    expect(links("02054")).toEqual(["02053"]);
    expect(links("02056")).toEqual(["02048", "02057"]);
    expect(links("02057")).toEqual(["02056"]);
  });

  it("The Hour is Late connects to the Administration Building", () => {
    const r = ea({ log: THAW, prep: (g) => void place(g, "02055") });
    const g = gOf(r);
    expect(connections(g, loc(g, "02055")!).map((id) => card(g, id).code)).toEqual(["02053"]);
  });
});

// ---------- 1.6 the shared sets ----------
describe("Sorcery, The Beyond, Bishop's Thralls, Dunwich, Whippoorwills, Bad Luck, Beast Thralls, Naomi's Crew, Hideous Abominations", () => {
  it("02083 Visions of Futures Past: failing by 2 discards the top 2", () => {
    const r = ea();
    const after = toTurn(draw(r, "02083"), R); // willpower 3 + 0 vs 5
    expect(inv(gOf(after), R).discard.length - inv(gOf(r), R).discard.length).toBe(2);
  });

  it("02084 Beyond the Veil: into the threat area once; an empty deck deals 10 damage", () => {
    const one = toTurn(draw(ea(), "02084"), R);
    const veils = (r: Result) => threatArea(gOf(r), R).filter((c) => c.code === "02084").length;
    expect(veils(one)).toBe(1);
    expect(veils(toTurn(draw(one, "02084"), R))).toBe(1);
    const empty = mutate(one, (g) => {
      for (const id of inv(g, R).deck.slice(1)) moveCard(g, id, ZONE.Discard);
    });
    const after = toEnd(inject(empty, () => {}, { t: STEP.Draw, inv: R, n: 1 }));
    expect(inv(gOf(after), R).status).not.toBe("playing");
  });

  it("02085 Light of Aforgomon: on the agenda, all damage is direct; gone when the agenda advances", () => {
    let dog = "";
    const r = toTurn(draw(ea({ prep: (g) => void (dog = inPlay(g, R, "01021")) }), "02085"), R);
    const g = gOf(r);
    const light = findByCode(g, "02085", [ZONE.Attached])!;
    expect(light.attachedTo).toBe(currentAgenda(g));
    const hurt = run(r, {
      t: STEP.AssignDamage,
      inv: R,
      damage: 1,
      horror: 0,
      direct: false,
      source: null,
    });
    expect(inv(gOf(hurt), R).damage).toBe(1);
    expect(card(gOf(hurt), dog).damage).toBe(0);
    const advanced = run(r, { t: STEP.AdvanceAgenda });
    expect(card(gOf(advanced), light.id).zone).toBe(ZONE.EncounterDiscard);
  });

  it("02086 Thrall: spawns at the location with the most clues", () => {
    const r = ea({ prep: (g) => setCounter(g, loc(g, "02056")!, "clues", 4) });
    const after = toTurn(draw(r, "02086"), R);
    const thrall = findByCode(gOf(after), "02086", [ZONE.Enemy])!;
    expect(card(gOf(after), thrall.location!).code).toBe("02056");
  });

  it("02087 Wizard of Yog-Sothoth: attacks the engaged investigator who draws a Hex card, before it resolves", () => {
    const r = ea({ prep: (g) => void putEnemy(g, "02087", inv(g, R).location!, R) });
    const after = toTurn(draw(r, "02083"), R);
    const log = after.state.log.slice(r.state.log.length);
    const attack = log.findIndex((e) => e.type === "attack");
    const test = log.findIndex((e) => e.type === "testStart");
    expect(attack).toBeGreaterThanOrEqual(0);
    expect(attack).toBeLessThan(test);
  });

  it("02088 Unhallowed Country: no Ally can be played, an Ally's text is blank; a willpower test at turn end discards it", () => {
    let dog = "";
    let inHand = "";
    const r = toTurn(
      draw(
        ea({
          prep: (g) => {
            dog = inPlay(g, R, "01021");
            inHand = createCard(g, "01021", ZONE.Limbo, R);
            moveCard(g, inHand, ZONE.Hand);
          },
        }),
        "02088",
      ),
      R,
    );
    const g = gOf(r);
    expect(where(r, "02088")).toBe(ZONE.Threat);
    expect(canPlay(g, R, inHand, false)).toBe(false);
    expect(abilitiesOf(g, dog)).toEqual([]);
    const ended = until(pick(r, "End turn"), (x) => where(x, "02088") !== ZONE.Threat);
    expect(where(ended, "02088")).toBe(ZONE.EncounterDiscard); // willpower 3 vs 3
  });

  it("02089 Sordid and Silent: 1 horror to each investigator at its location at round end; discarded when the agenda advances", () => {
    const r = toTurn(draw(ea(), "02089"), R);
    expect(findByCode(gOf(r), "02089", [ZONE.Attached])!.location).toBe(loc(gOf(r), "02048"));
    const round = run(r, { t: STEP.Window, trigger: "roundEnds", data: {} });
    expect(inv(gOf(round), R).horror).toBe(1);
    expect(where(run(r, { t: STEP.AdvanceAgenda }), "02089")).toBe(ZONE.EncounterDiscard);
  });

  it("02090 Whippoorwill: −1 to each skill of the investigators at its location", () => {
    const r = ea({ prep: (g) => void putEnemy(g, "02090", inv(g, R).location!) });
    expect(skillValue(gOf(r), R, "willpower")).toBe(2);
    expect(skillValue(gOf(r), R, "combat")).toBe(3);
  });

  it("02091 Eager for Death: the difficulty grows with your damage; a failure deals 2 horror", () => {
    const r = ea({ prep: (g) => setCounter(g, R, "damage", 2) });
    const after = toTurn(draw(r, "02091"), R);
    expect(lastTest(after)?.difficulty).toBe(4);
    expect(inv(gOf(after), R).horror).toBe(2);
  });

  it("02092 Cursed Luck: −1 skill value in tests; discarded after a success by 1 or more", () => {
    const r = toTurn(draw(ea(), "02092"), R);
    const failed = run(r, {
      t: STEP.Eff,
      effect: { op: "skillTest", skill: "willpower", difficulty: 2 },
      ctx: { you: R, source: null },
    });
    expect(lastTest(failed)?.total).toBe(2);
    expect(where(failed, "02092")).toBe(ZONE.Threat); // 2 vs 2: by 0
    const won = run(r, {
      t: STEP.Eff,
      effect: { op: "skillTest", skill: "willpower", difficulty: 1 },
      ctx: { you: R, source: null },
    });
    expect(where(won, "02092")).toBe(ZONE.EncounterDiscard);
  });

  it("02093 Twist of Fate: a symbol deals 2 horror, a 0 or less 1 damage, a positive number nothing", () => {
    const by = (token: ChaosToken) => {
      const after = toTurn(draw(ea({ bag: [token] }), "02093"), R);
      return [inv(gOf(after), R).damage, inv(gOf(after), R).horror];
    };
    expect(by("skull")).toEqual([0, 2]);
    expect(by("-1")).toEqual([1, 0]);
    expect(by("+1")).toEqual([0, 0]);
  });

  it("02094 Avian Thrall: −3 fight against a Firearm", () => {
    let thrall = "";
    const r = ea({
      prep: (g) => {
        thrall = putEnemy(g, "02094", inv(g, R).location!, R);
        inPlay(g, R, "01016");
      },
    });
    expect(enemyStat(gOf(r), thrall, "fight")).toBe(5);
    expect(
      lastTest(until(use(r, "01016"), (x) => x.state.pending?.kind === "turn"))?.difficulty,
    ).toBe(2);
  });

  it("02095 Lupine Thrall: spawns at the farthest location from you", () => {
    const r = ea({ prep: (g) => void place(g, "02052", true) });
    const after = toTurn(draw(r, "02095"), R);
    const thrall = findByCode(gOf(after), "02095", [ZONE.Enemy])!;
    expect(card(gOf(after), thrall.location!).code).toBe("02052");
  });

  it("02096 Altered Beast: surges with no Abomination; else heals one and attaches; entering its location deals 1 horror", () => {
    const alone = draw(ea(), "02096");
    expect(alone.state.log.filter((e) => e.type === "encounter").length).toBeGreaterThan(
      ea().state.log.filter((e) => e.type === "encounter").length + 1,
    );
    let thrall = "";
    const r = ea({
      prep: (g) => {
        thrall = putEnemy(g, "02086", loc(g, "02050")!);
        setCounter(g, thrall, "damage", 1);
      },
    });
    const beast = toTurn(draw(r, "02096"), R);
    expect(card(gOf(beast), thrall).damage).toBe(0);
    expect(findByCode(gOf(beast), "02096", [ZONE.Attached])!.attachedTo).toBe(thrall);
    const moved = toTurn(move(beast, "02050"), R);
    expect(inv(gOf(moved), R).horror).toBe(1);
  });

  it("02097 O'Bannion's Thug: while engaged with you, you gain no resources", () => {
    const r = ea({ prep: (g) => void putEnemy(g, "02097", inv(g, R).location!, R) });
    const before = inv(gOf(r), R).resources;
    expect(inv(gOf(pick(r, /^Gain 1 resource/)), R).resources).toBe(before);
  });

  it("02098 Mobster: after it attacks you, you lose 1 resource", () => {
    let mob = "";
    const r = ea({ prep: (g) => void (mob = putEnemy(g, "02098", inv(g, R).location!, R)) });
    const before = inv(gOf(r), R).resources;
    const after = run(r, { t: STEP.EnemyAttack, enemy: mob, inv: R, aoo: false, key: "atk:test" });
    expect(inv(gOf(after), R).resources).toBe(before - 1);
    expect(inv(gOf(after), R).damage).toBe(1);
  });

  it("02099 Hunted Down: each unengaged Criminal moves toward you, engages and attacks", () => {
    let mob = "";
    const r = ea({ prep: (g) => void (mob = putEnemy(g, "02098", loc(g, "02050")!)) });
    const after = toTurn(draw(r, "02099"), R);
    expect(card(gOf(after), mob).engagedWith).toBe(R);
    expect(inv(gOf(after), R).damage).toBe(1);
  });

  it("02100 Pushed into the Beyond: an asset into the deck; its copy among the top 3 discarded deals 2 horror", () => {
    let dog = "";
    const r = ea({
      prep: (g) => {
        dog = inPlay(g, R, "01021");
        for (const id of inv(g, R).deck.slice(2)) moveCard(g, id, ZONE.Discard);
      },
    });
    const after = toTurn(draw(r, "02100"), R);
    expect(card(gOf(after), dog).zone).toBe(ZONE.Discard);
    expect(inv(gOf(after), R).horror).toBe(2);
  });

  it("02101 Terror from Beyond: each card of the chosen type leaves every hand; two types for a second copy", () => {
    const r = ea({ invs: [R, D] });
    const first = until(draw(r, "02101"), (x) => /card type/.test(x.state.pending?.prompt ?? ""));
    const assets = pick(first, "asset");
    const types = (x: Result, i: string) => inv(gOf(x), i).hand.map((h) => def(gOf(x), h).type);
    expect(types(assets, R)).not.toContain("asset");
    expect(types(assets, D)).not.toContain("asset");
    const again = until(draw(toTurn(assets, R), "02101"), (x) =>
      /card type/.test(x.state.pending?.prompt ?? ""),
    );
    const second = until(pick(again, "event"), (x) =>
      /card type/.test(x.state.pending?.prompt ?? ""),
    );
    expect(options(second)).not.toContain("event");
  });

  it("02102 Arcane Barrier: a willpower test to move into its location; a failure may cancel the move", () => {
    let barrier = "";
    const prep = (game: GameContext) => {
      barrier = createCard(game, "02102", ZONE.Limbo);
      moveCard(game, barrier, ZONE.Attached, { location: loc(game, "02051")! });
    };
    const r = ea({ prep });
    const failed = until(move(r, "02051"), (x) => options(x).includes("Cancel the move"));
    const stayed = toTurn(pick(failed, "Cancel the move"), R);
    expect(at(stayed)).toBe("02048");
    expect(inv(gOf(stayed), R).actionsLeft).toBe(inv(gOf(r), R).actionsLeft - 1);
    const passed = toTurn(move(ea({ bag: ["+1"], prep }), "02051"), R);
    expect(at(passed)).toBe("02051");
    expect(card(gOf(passed), barrier).zone).toBe(ZONE.EncounterDiscard);
  });

  it("02103 Conglomeration of Spheres: the Melee card it was attacked with is discarded", () => {
    let machete = "";
    const r = ea({
      prep: (g) => {
        putEnemy(g, "02103", inv(g, R).location!, R);
        machete = inPlay(g, R, "01020");
      },
    });
    expect(card(gOf(toTurn(use(r, "01020"), R)), machete).zone).toBe(ZONE.Discard);
  });

  it("02104 Servant of the Lurker: when it attacks you, the top 2 cards of your deck are discarded", () => {
    let servant = "";
    const r = ea({ prep: (g) => void (servant = putEnemy(g, "02104", inv(g, R).location!, R)) });
    const after = run(r, {
      t: STEP.EnemyAttack,
      enemy: servant,
      inv: R,
      aoo: false,
      key: "atk:test",
    });
    expect(inv(gOf(after), R).discard.length - inv(gOf(r), R).discard.length).toBe(2);
  });
});

// ---------- 1.7 the scenario's cards ----------
describe("the scenario's cards", () => {
  it("02042 Quiet Halls: horror by the discard pile; agenda 2 next, or its back at once after The House Always Wins", () => {
    const prep = (game: GameContext) => {
      for (const id of inv(game, R).deck.slice(0, 5)) moveCard(game, id, ZONE.Discard);
    };
    const first = run(ea({ prep }), { t: STEP.AdvanceAgenda });
    expect(inv(gOf(first), R).horror).toBe(1);
    expect(card(gOf(first), currentAgenda(gOf(first))!).code).toBe("02043");
    const late = run(ea({ log: THAW, prep }), { t: STEP.AdvanceAgenda });
    const g = gOf(late);
    expect(card(g, currentAgenda(g)!).code).toBe("02044");
    expect(loc(g, "02052")).toBeDefined();
    expect(card(g, findByCode(g, "02058", [ZONE.Enemy])!.location!).code).toBe("02056");
  });

  it("02043 Dead of Night: hand size 3 lower; its back brings the Dormitories and The Experiment", () => {
    const two = run(ea(), { t: STEP.AdvanceAgenda });
    expect(handLimit(gOf(two), R)).toBe(5);
    const back = run(two, { t: STEP.AdvanceAgenda });
    const g = gOf(back);
    expect(loc(g, "02052")).toBeDefined();
    expect(card(g, findByCode(g, "02058", [ZONE.Enemy])!.location!).code).toBe("02056");
    // in play already, it moves toward the Dormitories instead
    const again = run(back, { t: STEP.Script, code: "02043", fn: "back", ctx: { source: null } });
    const e = findByCode(gOf(again), "02058", [ZONE.Enemy])!;
    expect(card(gOf(again), e.location!).code).toBe("02048");
  });

  it("02044 The Beast Unleashed: its doom threshold removes all doom and moves The Experiment instead; the Dormitories (→R4)", () => {
    const three = run(ea(), { t: STEP.AdvanceAgenda }, { t: STEP.AdvanceAgenda });
    const g0 = gOf(three);
    expect(card(g0, currentAgenda(g0)!).code).toBe("02044");
    const doom = run(
      three,
      { t: STEP.PlaceDoom, card: currentAgenda(g0)!, n: 2 },
      { t: STEP.CheckDoom },
    );
    const g = gOf(doom);
    expect(card(g, currentAgenda(g)!).code).toBe("02044");
    expect(card(g, currentAgenda(g)!).doom).toBe(0);
    expect(card(g, findByCode(g, "02058", [ZONE.Enemy])!.location!).code).toBe("02048");
    const again = run(
      doom,
      { t: STEP.PlaceDoom, card: currentAgenda(g)!, n: 2 },
      { t: STEP.CheckDoom },
    );
    const end = toEnd(again);
    expect(resolution(end)).toBe("R4");
    expect(inv(gOf(end), R).horror).toBe(3);
  });

  it("02045 After Hours: the encounter discard pile and Jazz shuffled into the encounter deck", () => {
    const r = ea({
      prep: (g) => {
        moveCard(g, pile(g, ZONE.EncounterDeck)[0], ZONE.EncounterDiscard);
      },
    });
    const after = run(r, { t: STEP.AdvanceAct });
    const g = gOf(after);
    expect(pile(g, ZONE.EncounterDiscard)).toEqual([]);
    expect(pile(g, ZONE.EncounterDeck).some((id) => card(g, id).code === "02060")).toBe(true);
    expect(card(g, currentAct(g)!).code).toBe("02046");
  });

  it("02046 Rice's Whereabouts: 1 clue discards the top 10 alone, Jazz among them comes into play; his control advances", () => {
    const act2 = run(ea({ prep: (g) => addCounter(g, R, "clues", 1) }), { t: STEP.AdvanceAct });
    const top = mutate(act2, (g) => {
      const jazz = findByCode(g, "02060", [ZONE.EncounterDeck])!;
      moveCard(g, jazz.id, ZONE.EncounterDeck, { top: true });
    });
    const used = toTurn(use(top, "02046"), R);
    const g = gOf(used);
    expect(pile(g, ZONE.EncounterDiscard)).toHaveLength(9);
    const jazz = findByCode(g, "02060", [ZONE.Attached])!;
    expect(jazz.location).toBe(loc(g, "02048"));
    const parley = until(use(used, "02060", 1), (x) => x.state.pending?.kind === "turn");
    expect(card(gOf(parley), jazz.id).controller).toBe(R); // intellect 3 vs 3
    expect(card(gOf(parley), currentAct(gOf(parley))!).code).toBe("02047");
    // its back: the Alchemy Labs, The Experiment there (agenda 1), the Concoction removed in a first scenario
    expect(loc(gOf(parley), "02057")).toBeDefined();
    const e = findByCode(gOf(parley), "02058", [ZONE.Enemy])!;
    expect(card(gOf(parley), e.location!).code).toBe("02057");
    expect(where(parley, "02059")).toBe(ZONE.Removed);
  });

  it("02046's back after The House Always Wins: the Concoction beneath the Alchemy Labs", () => {
    const r = run(ea({ log: THAW }), { t: STEP.AdvanceAct }, { t: STEP.AdvanceAct });
    const g = gOf(r);
    expect(cardsBeneath(g, loc(g, "02057")!).map((id) => card(g, id).code)).toEqual(["02059"]);
  });

  it("02048 Miskatonic Quad: resign; everyone resigned is no resolution", () => {
    expect(resolution(toEnd(pick(ea(), "Miskatonic Quad: resign")))).toBe("none");
  });

  it("02049 Humanities Building: at the end of your turn there, discard as many cards as your horror", () => {
    const r = ea({ prep: (g) => setCounter(g, R, "horror", 2) });
    const there = toTurn(move(r, "02049"), R);
    const before = inv(gOf(there), R).discard.length;
    const ended = until(pick(there, "End turn"), (x) => inv(gOf(x), R).discard.length > before);
    expect(inv(gOf(ended), R).discard.length - before).toBe(2);
  });

  it("02050 Orne Library: investigating it costs 2 actions", () => {
    const there = toTurn(move(ea(), "02050"), R);
    const left = inv(gOf(there), R).actionsLeft;
    const done = toTurn(pick(there, /^Investigate/), R);
    expect(left - inv(gOf(done), R).actionsLeft).toBe(2);
  });

  it("02051 Student Union: revealed, the Dormitories come into play; heal 1 damage and 1 horror for 2 actions", () => {
    const r = ea({
      prep: (g) => {
        setCounter(g, R, "damage", 1);
        setCounter(g, R, "horror", 1);
      },
    });
    const there = toTurn(move(r, "02051"), R);
    expect(loc(gOf(there), "02052")).toBeDefined();
    const healed = toTurn(use(there, "02051", 1), R);
    expect([inv(gOf(healed), R).damage, inv(gOf(healed), R).horror]).toEqual([0, 0]);
    expect(inv(gOf(there), R).actionsLeft - inv(gOf(healed), R).actionsLeft).toBe(2);
  });

  it("02052 Dormitories: locked while unrevealed (not for Jazz's controller); 3 clues each here (→R2)", () => {
    const r = toTurn(move(ea(), "02051"), R);
    expect(options(r)).not.toContain("Move to Dormitories");
    const jazz = mutate(r, (g) => {
      const j = findByCode(g, "02060", [ZONE.SetAside])!;
      moveCard(g, j.id, ZONE.Play);
      setController(g, j.id, R);
    });
    expect(options(jazz)).toContain("Move to Dormitories");
    const inside = toTurn(
      move(
        mutate(jazz, (g) => addCounter(g, R, "clues", 3)),
        "02052",
      ),
      R,
    );
    const won = toEnd(pick(inside, /Dormitories: spend 3 clues/));
    expect(resolution(won)).toBe("R2");
  });

  it("02053 Administration Building: revealed, the Faculty Offices come into play; a card discarded at turn end there", () => {
    const there = toTurn(move(ea(), "02053"), R);
    expect(loc(gOf(there), "02054")).toBeDefined();
    const before = inv(gOf(there), R).discard.length;
    const ended = until(pick(there, "End turn"), (x) => inv(gOf(x), R).discard.length > before);
    expect(inv(gOf(ended), R).discard.length - before).toBe(1);
  });

  it("02054 Faculty Offices (The Night is Still Young): revealed, a Humanoid enemy spawns there; 2 clues each (→R1)", () => {
    const r = ea({
      prep: (g) => {
        place(g, "02054");
        const jazz = findByCode(g, "02060", [ZONE.SetAside])!;
        moveCard(g, jazz.id, ZONE.Play);
        setController(g, jazz.id, R);
        addCounter(g, R, "clues", 2);
      },
    });
    const admin = toTurn(move(r, "02053"), R);
    const inside = toTurn(move(admin, "02054"), R);
    const g = gOf(inside);
    const offices = loc(g, "02054")!;
    expect(
      enemies(g).some((e) => e.location === offices && def(g, e.id).traits.includes("Humanoid")),
    ).toBe(true);
    const won = toEnd(pick(inside, /Faculty Offices: spend 2 clues/));
    expect(resolution(won)).toBe("R1");
  });

  it("02055 Faculty Offices (The Hour is Late): locked while unrevealed", () => {
    const r = ea({ log: THAW, prep: (g) => void place(g, "02055") });
    const admin = toTurn(move(r, "02053"), R);
    expect(options(admin)).not.toContain("Move to Faculty Offices");
  });

  it("02056 Science Building: revealed, the Alchemy Labs come into play; a failed willpower test there deals 1 damage", () => {
    const there = toTurn(move(ea(), "02056"), R);
    expect(loc(gOf(there), "02057")).toBeDefined();
    const failed = run(there, {
      t: STEP.Eff,
      effect: { op: "skillTest", skill: "willpower", difficulty: 9 },
      ctx: { you: R, source: null },
    });
    expect(inv(gOf(failed), R).damage).toBe(1);
    const other = run(there, {
      t: STEP.Eff,
      effect: { op: "skillTest", skill: "intellect", difficulty: 9 },
      ctx: { you: R, source: null },
    });
    expect(inv(gOf(other), R).damage).toBe(0);
  });

  it("02057 Alchemy Labs: a successful investigation takes the Alchemical Concoction from beneath it", () => {
    const r = ea({
      bag: ["+1"],
      prep: (g) => {
        const labs = place(g, "02057", true);
        const concoction = findByCode(g, "02059", [ZONE.SetAside])!;
        putBeneath(g, concoction.id, labs);
        placeInvestigator(g, R, labs);
      },
    });
    const missed = toTurn(use(r, "02057"), R); // intellect 3 + 1 vs shroud 5
    expect(lastTest(missed)?.success).toBe(false);
    expect(findByCode(gOf(missed), "02059", [ZONE.Beneath])).toBeDefined();
    const sharp = mutate(r, (g) => addTempMod(g, { stat: "intellect", value: 2 }, R, "round"));
    const took = toTurn(use(sharp, "02057"), R);
    expect(findByCode(gOf(took), "02059", [ZONE.Play])?.controller).toBe(R);
  });

  it("02058 The Experiment: 7 + 3 per investigator health; readies as the enemy phase begins (its defeat: R3 below)", () => {
    const r = run(ea({ invs: [R, D] }), { t: STEP.AdvanceAgenda }, { t: STEP.AdvanceAgenda });
    const g = gOf(r);
    const e = findByCode(g, "02058", [ZONE.Enemy])!;
    expect(enemyStat(g, e.id, "health")).toBe(13);
    const tired = mutate(r, (gg) => exhaust(gg, e.id));
    const enemyPhase = mutate(tired, (gg) => setPhase(gg, "enemy"));
    const readied = run(enemyPhase, { t: STEP.Window, trigger: "phaseBegins", data: {} });
    expect(card(gOf(readied), e.id).exhausted).toBe(false);
  });

  it("02059 Alchemical Concoction: fights with intellect, +6 damage against The Experiment, then leaves the game", () => {
    let concoction = "";
    let experiment = "";
    const r = ea({
      bag: ["+1"],
      prep: (g) => {
        experiment = putEnemy(g, "02058", inv(g, R).location!);
        const c = findByCode(g, "02059", [ZONE.SetAside])!;
        concoction = c.id;
        moveCard(g, c.id, ZONE.Play);
        setController(g, c.id, R);
      },
    });
    const hit = toTurn(use(r, "02059"), R); // intellect 3 + 1 vs fight 4
    expect(lastTest(hit)?.skill).toBe("intellect");
    expect(card(gOf(hit), experiment).damage).toBe(7);
    expect(card(gOf(hit), concoction).zone).toBe(ZONE.Removed);
  });

  it('02060 "Jazz" Mulligan: his revelation puts him at your location; parley (intellect 3) takes control', () => {
    const r = toTurn(draw(ea(), "02060"), R);
    const jazz = findByCode(gOf(r), "02060", [ZONE.Attached])!;
    expect(jazz.location).toBe(loc(gOf(r), "02048"));
    expect(jazz.controller).toBeNull();
    const won = toTurn(use(r, "02060", 1), R);
    expect(card(gOf(won), jazz.id).controller).toBe(R);
  });

  it("02061 Professor Warren Rice: +1 intellect; the last clue of your location draws a card", () => {
    const r = ea({
      bag: ["+1"],
      prep: (g) => {
        const rice = findByCode(g, "02061", [ZONE.SetAside])!;
        moveCard(g, rice.id, ZONE.Play);
        setController(g, rice.id, R);
        setCounter(g, loc(g, "02048")!, "clues", 1);
      },
    });
    expect(skillValue(gOf(r), R, "intellect")).toBe(4);
    const hand = inv(gOf(r), R).hand.length;
    const found = until(pick(r, /^Investigate/), (x) =>
      /Warren Rice: draw/.test(options(x).join()),
    );
    const drew = toTurn(pick(found, /Warren Rice: draw/), R);
    expect(inv(gOf(drew), R).hand.length).toBe(hand + 1);
  });
});

// ---------- 1.8 every resolution ----------
describe("the resolutions, played", () => {
  /** agenda 3 current, The Experiment in play at the Science Building */
  const agenda3 = (opts: Opts = {}) =>
    run(ea(opts), { t: STEP.AdvanceAgenda }, { t: STEP.AdvanceAgenda });
  const experiment = (r: Result) => findByCode(gOf(r), "02058", [ZONE.Enemy])!.id;

  it("R1: the clues spent in The Night is Still Young", () => {
    const r = ea({
      prep: (g) => {
        place(g, "02054", true);
        placeInvestigator(g, R, loc(g, "02054")!);
        addCounter(g, R, "clues", 2);
      },
    });
    expect(resolution(toEnd(pick(r, /Faculty Offices: spend 2 clues/)))).toBe("R1");
  });

  it("R2: the clues spent in the Dormitories", () => {
    const r = ea({
      prep: (g) => {
        place(g, "02052", true);
        placeInvestigator(g, R, loc(g, "02052")!);
        addCounter(g, R, "clues", 3);
      },
    });
    expect(resolution(toEnd(pick(r, /Dormitories: spend 3 clues/)))).toBe("R2");
  });

  it("R3: The Experiment defeated", () => {
    const r = agenda3();
    const killed = run(r, { t: STEP.DefeatEnemy, enemy: experiment(r), by: R });
    expect(resolution(toEnd(killed))).toBe("R3");
  });

  it("R4: The Experiment enters the Dormitories, the investigators take 3 horror", () => {
    const r = agenda3();
    const moved = run(
      mutate(r, (g) => setCardLocation(g, experiment(r), loc(g, "02051")!)),
      { t: STEP.Script, code: "02043", fn: "back", ctx: { source: null } },
    );
    const end = toEnd(moved);
    expect(resolution(end)).toBe("R4");
    expect(inv(gOf(end), R).horror).toBe(3);
  });

  it("no resolution: everyone resigned", () => {
    const r = ea({ invs: [R, D] });
    const one = toTurn(pick(r, "Miskatonic Quad: resign"), D);
    expect(resolution(toEnd(pick(one, "Miskatonic Quad: resign")))).toBe("none");
  });
});

// ---------- random legal play: the engine never throws or dead-locks ----------
describe("random play", () => {
  for (const [invs, log] of [
    [[R], {}],
    [[R, D], THAW],
    [[R, D, "01003", "01004"], {}],
  ] as const)
    for (const seed of [1, 2, 3])
      it(`${invs.join("+")} seed ${seed}`, () => {
        let r = ea({
          invs: [...invs],
          log,
          bag: ["+1", "0", "-1", "-2", "skull", "cultist", "elderThing", "autoFail", "elderSign"],
        });
        const rng = { rng: seed * 7919 };
        for (let k = 0; r.state.pending && k < 3000; k++) {
          const p = r.state.pending;
          const end = p.options.find((o) => o.label === "End turn");
          const o =
            end && next(rng) < 0.3 ? end : p.options[Math.floor(next(rng) * p.options.length)];
          const res = dispatch(db, r.state, { type: "choose", inv: p.inv, option: o.id });
          if (res.error) throw new Error(res.error);
          r = res;
        }
        expect(r.state.phase === "ended" || r.state.pending).toBeTruthy();
      });
});
