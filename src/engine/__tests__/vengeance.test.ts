/** Vengeance in the victory display and Yig's Fury (engine-tfa-supplies-vengeance-exploration group 3). */
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import type { CardDef } from "../../content/schema";
import { dispatch, type Result } from "../index";
import { card, inv, reveal } from "../context";
import { createCard, moveCard } from "../movement";
import { checkCondition, findByCode, vengeanceCards, vengeanceInVictory } from "../queries";
import { finishRevelation } from "../rules/scenario";
import { tokenX } from "../rules/tokens";
import { amt } from "../effects/targets";
import { scenarioFacts } from "../campaign/campaign";
import { game, inject, toTurn } from "../kits/driver";
import { db, gOf, mutate, putEnemy, skipMulligans } from "../kits/testkit";
import { STEP } from "../steps/step";
import { ZONE } from "../world/constants";

beforeAll(async () => {
  await loadPack("tfa");
});

const R = "01001";
const PIT_VIPER = "04078"; // enemy, Vengeance 1
const ANCESTRAL_FEAR = "04093"; // treachery, Vengeance 1
const RUINS = "04066"; // location, Vengeance 1: considered in the victory display while an enemy is there
const WOODS = "04217"; // Time-Wracked Woods
const MINION = "01160"; // Ghoul Minion: no vengeance

const saved = new Map<string, CardDef>();
const patch = (code: string, fields: Partial<CardDef>) => {
  if (!saved.has(code)) saved.set(code, db.cards[code]);
  db.cards[code] = { ...db.cards[code], ...fields };
};
afterEach(() => {
  for (const [code, d] of saved) db.cards[code] = d;
  saved.clear();
});

const start = () => toTurn(skipMulligans(game({ investigators: [R], bag: ["0"] })));
const here = (r: Result) => inv(gOf(r), R).location!;

describe("vengeance cards go to the victory display (3.1)", () => {
  it("a defeated enemy with vengeance", () => {
    let id = "";
    let r = mutate(start(), (g) => void (id = putEnemy(g, PIT_VIPER, here(start()))));
    r = inject(r, () => {}, { t: STEP.DefeatEnemy, enemy: id, by: R });
    expect(card(gOf(r), id).zone).toBe(ZONE.Victory);
    expect(vengeanceInVictory(gOf(r))).toBe(1);
  });

  it("a treachery with vengeance once it has resolved", () => {
    let id = "";
    const r = mutate(start(), (g) => {
      id = createCard(g, ANCESTRAL_FEAR, ZONE.Resolving);
      finishRevelation(g, id, R);
    });
    expect(card(gOf(r), id).zone).toBe(ZONE.Victory);
  });

  it("a revealed clue-less location joins it at the end; an enemy without vengeance does not count", () => {
    let ruins = "";
    const r = mutate(start(), (g) => {
      ruins = createCard(g, RUINS, ZONE.Limbo);
      moveCard(g, ruins, ZONE.Location);
      reveal(g, ruins);
      putEnemy(g, MINION, here(start()));
    });
    expect(vengeanceInVictory(gOf(r))).toBe(0);
    expect(vengeanceCards(gOf(r), true)).toEqual([ruins]);
    expect(vengeanceInVictory(gOf(r), true)).toBe(1);
  });
});

describe("counting vengeance (3.2)", () => {
  it("a static makes a card in play count while its condition holds (Underground Ruins)", () => {
    patch(RUINS, {
      abilities: [
        {
          kind: "constant",
          condition: { enemyAtThisLocation: {} },
          modifiers: [{ flag: "consideredInVictory", scope: "self" }],
        } as CardDef["abilities"][number],
      ],
    });
    let ruins = "";
    let r = mutate(start(), (g) => {
      ruins = createCard(g, RUINS, ZONE.Limbo);
      moveCard(g, ruins, ZONE.Location);
      reveal(g, ruins);
    });
    expect(vengeanceInVictory(gOf(r))).toBe(0);
    r = mutate(r, (g) => void putEnemy(g, MINION, ruins));
    expect(vengeanceInVictory(gOf(r))).toBe(1);
  });

  it("is an amount, a condition and a token's X", () => {
    let id = "";
    let r = mutate(start(), (g) => void (id = putEnemy(g, PIT_VIPER, here(start()))));
    r = inject(r, () => {}, { t: STEP.DefeatEnemy, enemy: id, by: R });
    const g = gOf(r);
    expect(amt(g, "vengeanceInVictory", { you: R })).toBe(1);
    expect(checkCondition(g, { vengeanceInVictory: { min: 1 } }, { you: R })).toBe(true);
    expect(checkCondition(g, { vengeanceInVictory: { min: 2 } }, { you: R })).toBe(false);
    expect(tokenX(g, "vengeanceInVictory", R)).toBe(1);
  });
});

describe("the scenario's record (3.3)", () => {
  it("keeps the vengeance and its cards for Yig's Fury and 'the jungle watches'", () => {
    let id = "";
    let r = mutate(start(), (g) => void (id = putEnemy(g, PIT_VIPER, here(start()))));
    r = inject(r, () => {}, { t: STEP.DefeatEnemy, enemy: id, by: R });
    r = inject(r, () => {}, { t: STEP.Resolution, id: "R1" });
    expect(scenarioFacts(db, r.state)).toMatchObject({
      vengeance: 1,
      vengeanceCodes: [PIT_VIPER],
    });
  });

  it("Time-Wracked Woods returns a vengeance card from the victory display", () => {
    let id = "";
    let r = mutate(start(), (g) => void (id = putEnemy(g, PIT_VIPER, here(start()))));
    r = inject(r, () => {}, { t: STEP.DefeatEnemy, enemy: id, by: R });
    r = inject(r, () => {}, {
      t: STEP.Eff,
      effect: { op: "returnVengeanceCard" },
      ctx: { you: R, source: findByCode(gOf(r), WOODS)?.id },
    });
    if (r.state.pending?.options.some((o) => o.value === id))
      r = dispatch(db, r.state, { type: "choose", inv: R, option: id });
    expect(card(gOf(r), id).zone).toBe(ZONE.EncounterDiscard);
    expect(vengeanceInVictory(gOf(r))).toBe(0);
  });
});
