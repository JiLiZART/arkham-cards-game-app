/** The vocabulary Undimensioned and Unseen added (campaign-the-dunwich-legacy, task 6.1), outside its scenario: one test per entry. */
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../../content";
import type { Effect } from "../../../content/schema";
import type { Result } from "../../index";
import { card, inv, setCounter, type GameContext } from "../../context";
import { actSpenders, attackable, enemiesAt, locations } from "../../queries";
import { randomLocation } from "../../rules/enemies";
import { tokenX } from "../../rules/tokens";
import { game, inject, inPlay, lastTest, toTurn } from "../../kits/driver";
import { db, gOf, putEnemy } from "../../kits/testkit";
import { STEP } from "../../steps/step";
import { createCard, moveCard } from "../../movement";
import { ZONE } from "../../world/constants";
import { startCampaign } from "../../campaign/campaign";

beforeAll(async () => {
  await loadPack("dwl");
});

const R = "01001"; // Roland: willpower 3, combat 4
const BROOD = "02255";
const start = (prep: (game: GameContext) => void = () => {}) =>
  game({ investigators: [R], bag: ["0"], prep });
const effect = (r: Result, e: Effect, enemy: string | null = null) =>
  toTurn(
    inject(r, () => {}, { t: STEP.Eff, effect: e, ctx: { you: R, source: null, enemy } }),
    R,
  );
const here = (game: GameContext) => inv(game, R).location!;

describe("Amount cluesOnEnemy, a fight's skill bonus and its filter", () => {
  it("+2 per clue on the attacked enemy; only enemies matching the filter", () => {
    const r = start((g) => setCounter(g, putEnemy(g, "01160", here(g), R), "clues", 3));
    const fought = effect(r, {
      op: "fight",
      skill: "willpower",
      bonus: { cluesOnEnemy: 2 },
      filter: { trait: "Ghoul" },
    });
    expect(lastTest(fought)).toMatchObject({ skill: "willpower", total: 3 + 6 });
    const none = effect(r, { op: "fight", filter: { trait: "Abomination" } });
    expect(lastTest(none)).toBeNull();
  });
});

describe("onlyAttackableBy", () => {
  it("a Brood can be attacked only with Esoteric Formula, and damaged only by it", () => {
    let formula = "";
    let brood = "";
    const r = start((g) => {
      brood = putEnemy(g, BROOD, here(g), null);
      formula = inPlay(g, R, "02254");
    });
    const g = gOf(r);
    expect(attackable(g, brood)).toBe(false);
    expect(attackable(g, brood, formula)).toBe(true);
    const hit = toTurn(
      inject(r, () => {}, { t: STEP.DamageEnemy, enemy: brood, amount: 1, by: R, source: null }),
      R,
    );
    expect(card(gOf(hit), brood).damage).toBe(0);
    const byFormula = toTurn(
      inject(r, () => {}, { t: STEP.DamageEnemy, enemy: brood, amount: 1, by: R, source: formula }),
      R,
    );
    expect(card(gOf(byFormula), brood).damage).toBe(1);
  });
});

describe("x: broodInPlay", () => {
  it("counts the Brood of Yog-Sothoth in play", () => {
    const g = gOf(
      start((g2) => {
        putEnemy(g2, BROOD, here(g2), null);
        putEnemy(g2, BROOD, here(g2), null);
        putEnemy(g2, "01160", here(g2), null);
      }),
    );
    expect(tokenX(g, "broodInPlay", R)).toBe(2);
    expect(enemiesAt(g, here(g))).toHaveLength(3);
  });
});

describe("randomLocation", () => {
  it("a location in play, never one excluded", () => {
    const g = gOf(
      start((g2) => {
        const id = createCard(g2, "01112", ZONE.Limbo);
        moveCard(g2, id, ZONE.Location);
      }),
    );
    const all = locations(g).map((l) => l.id);
    for (let k = 0; k < 10; k++) {
      const pick = randomLocation(g, [here(g)]);
      expect(all).toContain(pick);
      expect(pick).not.toBe(here(g));
    }
    expect(randomLocation(g, all)).toBeNull();
  });
});

describe("actSpendAt", () => {
  it("only investigators at a location of that name spend the act's clues", () => {
    const g = gOf(start());
    expect(actSpenders(g)).toEqual([R]);
    g.db = { ...g.db, cards: { ...g.db.cards } };
    const act = g.s.acts.a!;
    const code = card(g, act).code;
    g.db.cards[code] = { ...g.db.cards[code], actSpendAt: "Whateley Ruins" };
    expect(actSpenders(g)).toEqual([]);
    g.db.cards[code] = { ...g.db.cards[code], actSpendAt: g.db.cards[card(g, here(g)).code].name };
    expect(actSpenders(g)).toEqual([R]);
  });
});

describe("addWeakness with several traits", () => {
  const NOTZ = "night-of-the-zealot";
  const saved = db.flows[NOTZ];
  afterEach(() => {
    db.flows[NOTZ] = saved;
  });
  it("a basic weakness with any one of them, for the campaign deck", () => {
    const begin = (seed: number) =>
      startCampaign(db, {
        campaignId: NOTZ,
        difficulty: "standard",
        seed,
        investigators: [{ code: R, deckId: "roland-starter" }],
      });
    const seeds = [1, 2, 3, 4];
    const plain = seeds.map(begin);
    db.flows[NOTZ] = {
      ...saved,
      before: { "the-gathering": ["zzWeakness"] },
      steps: {
        ...saved.steps,
        zzWeakness: {
          kind: "effects",
          effects: [{ do: "addWeakness", trait: ["Madness", "Injury", "Pact"] }],
        },
      },
    };
    seeds.forEach((seed, k) => {
      const deck = begin(seed).investigators[0].deck;
      expect(deck.length).toBe(plain[k].investigators[0].deck.length + 1);
      const code = deck.at(-1)!;
      expect(db.cards[code].subtype).toBe("basicweakness");
      expect(["Madness", "Injury", "Pact"].some((t) => db.cards[code].traits.includes(t))).toBe(
        true,
      );
    });
  });
});
