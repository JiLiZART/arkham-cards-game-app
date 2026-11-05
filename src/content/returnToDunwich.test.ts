import { beforeAll, describe, expect, it } from "vitest";
import { cardsOf } from "../engine/context";
import { db, skipMulligans, start } from "../engine/kits/testkit";
import { loadPack } from ".";

const BASE = db.campaigns["the-dunwich-legacy"].scenarios;
const RETURN = db.campaigns["return-to-the-dunwich-legacy"].scenarios;

describe("Return to The Dunwich Legacy over the base campaign (ADR-0038)", () => {
  beforeAll(async () => {
    await loadPack("dwl");
    await loadPack("return");
  });

  it("plays the 8 base scenarios in the base order, each found by its own id", () => {
    expect(RETURN).toEqual(BASE.map((id) => `return-to-${id}`));
    expect(db.campaigns["return-to-the-dunwich-legacy"].generated).toBe(false);
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
      expect(Object.keys(r.hooks ?? {})).toEqual(
        expect.arrayContaining(Object.keys(b.hooks ?? {})),
      );
      expect(Object.keys(r.fns ?? {})).toEqual(expect.arrayContaining(Object.keys(b.fns ?? {})));
    },
  );

  it("Return to Extracurricular Activity starts with the base's locations and its composed script", () => {
    const r = skipMulligans(start("return-to-extracurricular-activity", ["01001"], 1));
    expect(r.state.pending).not.toBeNull();
    expect(cardsOf(r.state).some((c) => c.code === "02048" && c.zone === "location")).toBe(true); // Miskatonic Quad
    expect(db.scripts["return-to-extracurricular-activity"].hooks?.checkObjectives).toBeTypeOf(
      "function",
    );
  });
});
