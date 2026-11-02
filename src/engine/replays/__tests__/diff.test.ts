import { describe, expect, it } from "vitest";
import { firstDiff, firstEventDiff } from "../diff";

describe("firstDiff", () => {
  it("is null for deep-equal values", () => {
    expect(firstDiff({ a: [1, { b: "x" }], c: null }, { a: [1, { b: "x" }], c: null })).toBeNull();
  });

  it("names the path and both values of the first difference", () => {
    const was = { cards: { c1: { clues: 1 }, c42: { clues: 2, zone: "location" } } };
    const now = { cards: { c1: { clues: 1 }, c42: { clues: 1, zone: "location" } } };
    expect(firstDiff(was, now)).toBe("cards.c42.clues: 2 != 1");
  });

  it("reports a key only one side has, and arrays of different lengths", () => {
    expect(firstDiff({ flags: { a: 1 } }, { flags: {} })).toBe("flags.a: 1 != (missing)");
    expect(firstDiff({ flags: {} }, { flags: { b: true } })).toBe("flags.b: (missing) != true");
    expect(firstDiff({ deck: ["c1", "c2"] }, { deck: ["c1"] })).toBe("deck.length: 2 != 1");
  });

  it("treats a key holding undefined as missing, as JSON does (the stored copy is JSON)", () => {
    expect(firstDiff({ a: 1, b: undefined }, { a: 1 })).toBeNull();
    expect(firstDiff({ a: 1 }, { a: 1, b: undefined })).toBeNull();
    expect(firstDiff({ a: 1 }, { a: 1, b: 0 })).toBe("b: (missing) != 0");
  });

  it("tells an array from an object, and a value from null", () => {
    expect(firstDiff({ x: [] }, { x: {} })).toBe("x: [] != {}");
    expect(firstDiff({ x: null }, { x: 0 })).toBe("x: null != 0");
  });
});

describe("firstEventDiff", () => {
  const ev = (type: string, text: string) => ({ type, text });

  it("is null for the same events", () => {
    expect(firstEventDiff([ev("draw", "a")], [ev("draw", "a")])).toBeNull();
  });

  it("names the index and both events", () => {
    expect(
      firstEventDiff(
        [ev("draw", "a"), ev("resource", "Roland loses 4 resources")],
        [ev("draw", "a"), ev("resource", "Roland loses 3 resources")],
      ),
    ).toBe('event 1: resource "Roland loses 4 resources" != resource "Roland loses 3 resources"');
  });

  it("reports a log that is longer or shorter", () => {
    expect(firstEventDiff([ev("draw", "a")], [ev("draw", "a"), ev("doom", "b")])).toBe(
      'event 1: (none) != doom "b"',
    );
  });
});
