/** The vocabulary The Miskatonic Museum added (campaign-the-dunwich-legacy, task 3.1): one test per entry. */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../../content";
import type { Effect } from "../../../content/schema";
import type { Result } from "../../index";
import {
  attachTo,
  card,
  inv,
  placeInvestigator,
  reveal,
  setController,
  setCounter,
  sideDeck,
  type GameContext,
} from "../../context";
import { createCard, moveCard } from "../../movement";
import { findByCode, isMassive } from "../../queries";
import { campaignTokens } from "../../world/flags";
import { game, inject, inPlay, lastTest, toTurn } from "../../kits/driver";
import { gOf, mutate, options, pick, putEnemy } from "../../kits/testkit";
import { STEP } from "../../steps/step";
import { ZONE } from "../../world/constants";

beforeAll(async () => {
  await loadPack("dwl");
});

const R = "01001"; // Roland: willpower 3, intellect 3, combat 4, agility 2; 5 resources
const D = "01002";
const start = (
  prep: (game: GameContext) => void = () => {},
  bag: Parameters<typeof game>[0]["bag"] = ["0"],
  invs = [R],
) => game({ investigators: invs, bag, prep });

const effect = (r: Result, e: Effect, ctx: Record<string, unknown> = {}) =>
  toTurn(
    inject(r, () => {}, { t: STEP.Eff, effect: e, ctx: { you: R, source: null, ...ctx } }),
    R,
  );

/** Roland moved to a new location of this code, revealed */
const at = (game: GameContext, code: string) => {
  const id = createCard(game, code, ZONE.Limbo);
  moveCard(game, id, ZONE.Location);
  reveal(game, id);
  placeInvestigator(game, R, id);
  return id;
};

describe("the flags cannotGainResources and cannotInvestigate", () => {
  it("an investigator who can't gain resources gains none, by action or by effect (Museum Entrance)", () => {
    const plain = start();
    const res = inv(gOf(plain), R).resources;
    const blocked = mutate(plain, (g) => void at(g, "02126"));
    expect(inv(gOf(effect(blocked, { op: "gainResources", amount: 2 })), R).resources).toBe(res);
    expect(inv(gOf(toTurn(pick(blocked, "Gain 1 resource"), R)), R).resources).toBe(res);
  });

  it("an investigator who can't investigate isn't offered it (Administration Office, 4 resources)", () => {
    const office = (n: number) =>
      mutate(start(), (g) => {
        at(g, "02130");
        setCounter(g, R, "resources", n);
      });
    expect(options(office(5)).some((o) => o.startsWith("Investigate"))).toBe(true);
    expect(options(office(4)).some((o) => o.startsWith("Investigate"))).toBe(false);
  });
});

describe("Amount { base, plus, if }", () => {
  const test: Effect = {
    op: "skillTest",
    skill: "willpower",
    difficulty: { base: 3, plus: 2, if: { enemyAtYourLocation: { code: "01160" } } },
  };
  it("the base, and `plus` more while the condition holds", () => {
    expect(lastTest(effect(start(), test))?.difficulty).toBe(3);
    const hunted = start((g) => void putEnemy(g, "01160", inv(g, R).location!, null));
    expect(lastTest(effect(hunted, test))?.difficulty).toBe(5);
  });
});

describe("damageAssets", () => {
  it("damage on each of your assets matching the filter; one with enough is defeated", () => {
    let lita = "";
    let gun = "";
    const r = start((g) => {
      lita = inPlay(g, R, "01117"); // Ally, 3 health
      gun = inPlay(g, R, "01006"); // Item, no health
    });
    const after = effect(r, { op: "damageAssets", amount: 1, filter: { trait: "Ally" } });
    expect(card(gOf(after), lita).damage).toBe(1);
    expect(card(gOf(after), gun).damage).toBe(0);
    const dead = effect(after, { op: "damageAssets", amount: 2, filter: { trait: "Ally" } });
    expect(card(gOf(dead), lita).zone).not.toBe(ZONE.Play);
  });
});

describe("addChaosTokens", () => {
  it("into the bag; `forCampaign` remembers them for the campaign's bag", () => {
    const r = effect(start(), { op: "addChaosTokens", tokens: ["tablet"] });
    expect(r.state.chaosBag).toEqual(["0", "tablet"]);
    expect(campaignTokens.get(gOf(r))).toBeUndefined();
    const kept = effect(r, { op: "addChaosTokens", tokens: ["elderThing"], forCampaign: true });
    expect(kept.state.chaosBag).toEqual(["0", "tablet", "elderThing"]);
    expect(campaignTokens.get(gOf(kept))).toEqual(["elderThing"]);
  });
});

describe("leavesPlay", () => {
  it("a card that leaves play goes where its card says, and what follows resolves (Adam Lynch)", () => {
    let adam = "";
    const r = start((g) => {
      adam = createCard(g, "02139", ZONE.Limbo);
      moveCard(g, adam, ZONE.Play);
      setController(g, adam, R);
    });
    // discarded: it leaves play
    const after = effect(r, { op: "discardAsset" });
    expect(card(gOf(after), adam).zone).toBe(ZONE.Removed);
    expect(after.state.chaosBag).toEqual(["0", "tablet"]);
  });

  it("to the void: its tokens go, its attachments stay (the Hunting Horror)", () => {
    let h = "";
    let shadow = "";
    const r = start((g) => {
      h = putEnemy(g, "02141", inv(g, R).location!, null);
      setCounter(g, h, "damage", 2);
      shadow = createCard(g, "02142", ZONE.Limbo);
      moveCard(g, shadow, ZONE.Attached);
      attachTo(g, shadow, h);
    });
    const after = inject(r, (g) => moveCard(g, h, ZONE.EncounterDiscard));
    expect(card(gOf(after), h).zone).toBe(ZONE.Void);
    expect(card(gOf(after), h).damage).toBe(0);
    expect(card(gOf(after), shadow).attachedTo).toBe(h);
  });
});

describe("loseActions all", () => {
  it("all that is left of your turn; nothing owed outside it", () => {
    const r = start(() => {}, ["0"], [R, D]);
    expect(inv(gOf(effect(r, { op: "loseActions", amount: "all" })), R).actionsLeft).toBe(0);
    const daisy = toTurn(
      pick(
        toTurn(
          inject(r, () => {}, {
            t: STEP.Eff,
            effect: { op: "loseActions", amount: "all" },
            ctx: { you: D, source: null },
          }),
          R,
        ),
        "End turn",
      ),
      D,
    );
    expect(inv(gOf(daisy), D).actionsLeft).toBe(3);
  });
});

describe("a side deck of locations", () => {
  it("cards moved into a named side deck, top first; one put into play leaves it", () => {
    const r = mutate(start(), (g) => {
      for (const code of ["02132", "02133"])
        moveCard(g, createCard(g, code, ZONE.Limbo), ZONE.SideDeck, { deck: "exhibit" });
      moveCard(g, createCard(g, "02134", ZONE.Limbo), ZONE.SideDeck, {
        deck: "exhibit",
        top: true,
      });
    });
    const g = gOf(r);
    const deck = () => sideDeck(g, "exhibit").map((id) => card(g, id).code);
    expect(deck()).toEqual(["02134", "02132", "02133"]);
    moveCard(g, sideDeck(g, "exhibit")[0], ZONE.Location);
    expect(deck()).toEqual(["02132", "02133"]);
  });
});

describe("a granted Massive", () => {
  it("an enemy a constant ability makes Massive is Massive (Shadow-spawned with 3 resources)", () => {
    let h = "";
    const r = start((g) => {
      h = putEnemy(g, "02141", inv(g, R).location!, null);
      const shadow = createCard(g, "02142", ZONE.Limbo);
      moveCard(g, shadow, ZONE.Attached);
      attachTo(g, shadow, h);
      setCounter(g, shadow, "resources", 3);
    });
    expect(isMassive(gOf(r), h)).toBe(true);
    expect(findByCode(gOf(r), "02141", [ZONE.Enemy])?.engagedWith).toBeNull();
  });
});
