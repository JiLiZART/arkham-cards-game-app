import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../engine/kits/testkit";
import { loadPack } from ".";
import { checkReturnTokens } from "./coverage";

const BASE = db.campaigns["the-path-to-carcosa"].scenarios;
const RETURN = db.campaigns["return-to-the-path-to-carcosa"].scenarios;

describe("Return to The Path to Carcosa over the base campaign (ADR-0038)", () => {
  beforeAll(async () => {
    await loadPack("ptc");
    await loadPack("return");
  });

  it("plays the 8 base scenarios in the base order, each found by its own id, hand-written", () => {
    expect(RETURN).toEqual(BASE.map((id) => `return-to-${id}`));
    expect(db.campaigns["return-to-the-path-to-carcosa"].generated).toBe(false);
  });

  it.each(BASE.map((id) => [id]))(
    "Return to %s: the base's card, table, hooks and functions, its box's setup card beside them",
    (id) => {
      const base = db.scenarios[id];
      const ret = db.scenarios[`return-to-${id}`];
      expect(ret.card).toBe(base.card);
      expect(ret.tokens).toEqual(base.tokens);
      expect(ret.setupCards).toHaveLength(1);
      expect(db.cards[ret.setupCards[0]]?.type).toBe("scenario");
      const b = db.scripts[id];
      const r = db.scripts[`return-to-${id}`];
      expect(r).toBeDefined();
      expect(Object.keys(b.hooks ?? {}).length).toBeGreaterThan(0);
      expect(Object.keys(r.hooks ?? {})).toEqual(
        expect.arrayContaining(Object.keys(b.hooks ?? {})),
      );
      expect(Object.keys(r.fns ?? {})).toEqual(expect.arrayContaining(Object.keys(b.fns ?? {})));
    },
  );

  it("a Return scenario's token table equals its base's: the check names the scenario and the difficulty", () => {
    expect(checkReturnTokens(db)).toEqual([]);
    const id = "return-to-the-last-king";
    const s = db.scenarios[id];
    const drifted = {
      ...db,
      scenarios: {
        ...db.scenarios,
        [id]: {
          ...s,
          tokens: { ...s.tokens, standard: { ...s.tokens.standard, skull: { modifier: -9 } } },
        },
      },
    };
    expect(checkReturnTokens(drifted)).toEqual([
      expect.objectContaining({ path: "tokens.standard", message: expect.stringContaining(id) }),
    ]);
  });
});
