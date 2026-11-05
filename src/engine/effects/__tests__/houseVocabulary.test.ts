/** The vocabulary The House Always Wins added (campaign-the-dunwich-legacy, task 2.1): one test per entry. */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../../content";
import type { Effect } from "../../../content/schema";
import type { Result } from "../../index";
import {
  addCounter,
  card,
  inv,
  placeInvestigator,
  reveal,
  setController,
  setCounter,
  type GameContext,
} from "../../context";
import { createCard, moveCard } from "../../movement";
import { findByCode, isAloof } from "../../queries";
import { remembered } from "../../world/flags";
import { game, inject, toTurn, until } from "../../kits/driver";
import { gOf, pick, putEnemy } from "../../kits/testkit";
import { STEP } from "../../steps/step";
import { ZONE } from "../../world/constants";

beforeAll(async () => {
  await loadPack("dwl");
});

const R = "01001"; // Roland: willpower 3, intellect 3, combat 4, agility 2
const D = "01002"; // Daisy
const EA = "extracurricular-activity";
const HAW = "the-house-always-wins";
const loc = (game: GameContext, code: string) => findByCode(game, code, [ZONE.Location])!.id;

/** Roland (and others) at the start of their first turn in a Dunwich scenario */
const start = (
  scenario: string,
  prep: (game: GameContext) => void = () => {},
  bag: Parameters<typeof game>[0]["bag"] = ["0"],
  invs = [R],
) =>
  game({ scenario, investigators: invs, bag, prep, extra: { campaignId: "the-dunwich-legacy" } });

/** run one effect for Roland, answering neutrally until his next action */
const effect = (r: Result, e: Effect, ctx: Record<string, unknown> = {}) =>
  toTurn(
    inject(r, () => {}, { t: STEP.Eff, effect: e, ctx: { you: R, source: null, ...ctx } }),
    R,
  );

describe("loseActions and endTurn", () => {
  it("during your turn the actions go at once", () => {
    const r = start(EA);
    const after = effect(r, { op: "loseActions", amount: 2 });
    expect(inv(gOf(after), R).actionsLeft).toBe(inv(gOf(r), R).actionsLeft - 2);
  });

  it("outside your turn they come off your next turn", () => {
    const r = start(EA, () => {}, ["0"], [R, D]);
    // Daisy loses an action during Roland's turn: her turn has 2
    const lost = toTurn(
      inject(r, () => {}, {
        t: STEP.Eff,
        effect: { op: "loseActions", amount: 1 },
        ctx: { you: D, source: null },
      }),
      R,
    );
    expect(inv(gOf(lost), R).actionsLeft).toBe(3);
    const daisy = toTurn(pick(lost, "End turn"), D);
    expect(inv(gOf(daisy), D).actionsLeft).toBe(2);
  });

  it("endTurn ends your turn", () => {
    const r = start(EA, () => {}, ["0"], [R, D]);
    const after = toTurn(effect(r, { op: "endTurn" }), D);
    expect(inv(gOf(after), R).turnDone).toBe(true);
    expect(after.state.pending?.inv).toBe(D);
  });
});

describe("gainClues", () => {
  it("clues from the bank, not from the location; an enemy watching for gained clues reacts", () => {
    const r = start(HAW);
    const g = gOf(r);
    const before = card(g, loc(g, "02070")).clues;
    const after = effect(r, { op: "gainClues", amount: 2 });
    expect(inv(gOf(after), R).clues).toBe(2);
    expect(card(gOf(after), loc(gOf(after), "02070")).clues).toBe(before);
    expect(after.events.some((e) => e.type === "clues")).toBe(true);
  });
});

describe("enemyAttack", () => {
  it("the enemy of a code readies, engages you and attacks", () => {
    let pit = "";
    // at the Lounge, Roland at La Bella Luna: the attack still comes
    const r = start(HAW, (g) => {
      pit = findByCode(g, "02078", [ZONE.Enemy])!.id;
    });
    const after = effect(r, { op: "enemyAttack", named: "02078", ready: true, engage: true });
    expect(card(gOf(after), pit).engagedWith).toBe(R);
    expect(inv(gOf(after), R).damage).toBe(2);
  });

  it("each enemy at your location attacks", () => {
    const r = start(EA, (g) => {
      putEnemy(g, "01160", inv(g, R).location!, null);
      putEnemy(g, "01160", inv(g, R).location!, null);
    });
    const after = effect(r, { op: "enemyAttack", enemy: "eachAtLocation" });
    expect(inv(gOf(after), R).damage).toBe(2);
  });

  it("the event's enemy attacks", () => {
    let ghoul = "";
    const r = start(EA, (g) => {
      ghoul = putEnemy(g, "01160", inv(g, R).location!, null);
    });
    const after = effect(r, { op: "enemyAttack", enemy: "eventEnemy" }, { enemy: ghoul });
    expect(inv(gOf(after), R).damage).toBe(1);
  });
});

describe("revealToken", () => {
  const cardroom: Effect = {
    op: "revealToken",
    on: [
      { tokens: ["elderSign"], effects: [{ op: "gainResources", amount: 2 }] },
      { parity: "even", effects: [{ op: "gainClues", amount: 2 }] },
    ],
  };
  for (const [token, clues, resources] of [
    ["elderSign", 0, 2],
    ["-2", 2, 0],
    ["0", 2, 0],
    ["-1", 0, 0],
    ["skull", 0, 0],
  ] as const)
    it(`${token}: ${clues} clues, ${resources} resources; the token goes back`, () => {
      const r = start(EA, () => {}, [token]);
      const after = effect(r, cardroom);
      expect(inv(gOf(after), R).clues).toBe(clues);
      expect(inv(gOf(after), R).resources - inv(gOf(r), R).resources).toBe(resources);
      expect(after.state.chaosBag).toEqual([token]);
    });
});

describe("TokenEffect.payToZero and onSuccess", () => {
  const test = (r: Result, difficulty = 0) =>
    inject(r, () => {}, {
      t: STEP.Eff,
      effect: { op: "skillTest", skill: "willpower", difficulty },
      ctx: { you: R, source: null },
    });
  const mods = (r: Result) =>
    (r.events.findLast((e) => e.type === "testResult")!.data as { tokenMods: number[] }).tokenMods;

  it("the skull: spend 2 resources and it is a 0", () => {
    const r = start(HAW, () => {}, ["skull"]);
    const asked = until(test(r), (x) => x.state.pending?.promptKey === "payToZero");
    const paid = toTurn(pick(asked, "pay"), R);
    expect(mods(paid)).toEqual([0]);
    expect(inv(gOf(paid), R).resources).toBe(inv(gOf(r), R).resources - 2);
  });

  it("the skull kept, or not asked without the resources", () => {
    const kept = toTurn(test(start(HAW, () => {}, ["skull"])), R);
    expect(mods(kept)).toEqual([-2]);
    const poor = start(HAW, (g) => setCounter(g, R, "resources", 1), ["skull"]);
    // the turn comes back without the question
    const after = toTurn(test(poor), (x) => x.state.pending?.promptKey === "payToZero");
    expect(after.state.pending?.kind).toBe("turn");
    expect(mods(after)).toEqual([-2]);
  });

  it("the cultist: a success gains 3 resources", () => {
    const r = start(HAW, () => {}, ["cultist"]);
    const after = toTurn(test(r), R);
    expect(mods(after)).toEqual([-3]);
    expect(inv(gOf(after), R).resources).toBe(inv(gOf(r), R).resources + 3);
  });
});

describe("evade by filter", () => {
  it("only an enemy matching the filter is evaded", () => {
    let ghoul = "";
    let thug = "";
    const r = start(EA, (g) => {
      ghoul = putEnemy(g, "01160", inv(g, R).location!, R);
      thug = putEnemy(g, "02097", inv(g, R).location!, R);
    });
    const after = effect(r, { op: "evade", auto: true, filter: { trait: "Criminal" } });
    expect(card(gOf(after), thug).engagedWith).toBeNull();
    expect(card(gOf(after), ghoul).engagedWith).toBe(R);
  });
});

describe("damage placed on an asset", () => {
  it("an asset no one controls is defeated when its damage reaches its health", () => {
    let peter = "";
    const r = start(HAW, (g) => {
      peter = createCard(g, "02079", ZONE.Limbo);
      moveCard(g, peter, ZONE.Attached, { location: inv(g, R).location });
      setController(g, peter, null);
      addCounter(g, peter, "damage", 2);
    });
    const after = effect(r, { op: "placeTokens", on: "self", damage: 1 }, { source: peter });
    expect(card(gOf(after), peter).zone).toBe(ZONE.EncounterDiscard);
  });
});

describe("noUpkeepDraw and noUpkeepResources", () => {
  it("an investigator in the VIP Area draws nothing and gains nothing in the upkeep phase", () => {
    const r = start(HAW, (g) => {
      const vip = findByCode(g, "02076", [ZONE.SetAside])!.id;
      moveCard(g, vip, ZONE.Location);
      reveal(g, vip);
      placeInvestigator(g, R, vip);
    });
    const hand = inv(gOf(r), R).hand.length;
    const res = inv(gOf(r), R).resources;
    // through the rest of the round to the next turn
    const next = toTurn(pick(r, "End turn"), R);
    expect(inv(gOf(next), R).hand.length).toBe(hand);
    expect(inv(gOf(next), R).resources).toBe(res);
  });
});

describe("a keyword granted by a constant ability", () => {
  it("The Clover Club makes each Criminal enemy aloof: it doesn't engage", () => {
    const r = start(HAW);
    const g = gOf(r);
    const pit = findByCode(g, "02078", [ZONE.Enemy])!;
    expect(isAloof(g, pit.id)).toBe(true);
    expect(pit.engagedWith).toBeNull();
    expect(remembered.get(g, ["cheated", R])).toBeUndefined();
  });
});
