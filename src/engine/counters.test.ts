import { describe, expect, it } from "vitest";
import { addCounter, counter, findByCode, setCounter, type G } from "./core";
import { gOf, skipMulligans, start } from "./testkit";

const R = "01001";
const fresh = (): G => gOf(skipMulligans(start("the-gathering", [R], 1)));

describe("counters", () => {
  it("read and change a card's tokens", () => {
    const g = fresh();
    const study = findByCode(g, "01111", ["location"])!.id;
    expect(counter(g, study, "clues")).toBe(g.s.cards[study].clues);
    expect(addCounter(g, study, "clues", -1)).toBe(g.s.cards[study].clues);
    setCounter(g, study, "doom", 3);
    expect(g.s.cards[study].doom).toBe(3);
  });

  it("read and change an investigator's damage, horror, clues and resources", () => {
    const g = fresh();
    expect(counter(g, R, "resources")).toBe(5);
    expect(addCounter(g, R, "resources", 2)).toBe(7);
    setCounter(g, R, "horror", 1);
    expect(g.s.invs[R].horror).toBe(1);
  });

  it("no clamping: what the rule writes is what is stored (rules clamp where they must)", () => {
    const g = fresh();
    expect(addCounter(g, R, "clues", -1)).toBe(-1);
  });

  it("refuses doom and uses on an investigator, and an id that is neither", () => {
    const g = fresh();
    expect(() => counter(g, R, "doom")).toThrow(/doom/);
    expect(() => counter(g, "nobody", "clues")).toThrow(/nobody/);
  });
});
