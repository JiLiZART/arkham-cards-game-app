import { describe, expect, it } from "vitest";
import { stackTokens } from "./tokenStack";

describe("stackTokens", () => {
  it("uses the fewest tokens, largest first", () => {
    expect(stackTokens(9, [5, 3, 1])).toEqual([5, 3, 1]);
    expect(stackTokens(8, [5, 3, 1])).toEqual([5, 3]);
    expect(stackTokens(11, [5, 3, 1])).toEqual([5, 5, 1]);
    expect(stackTokens(4, [3, 1])).toEqual([3, 1]);
    expect(stackTokens(7, [3, 1])).toEqual([3, 3, 1]);
  });
  it("nothing for zero or less", () => {
    expect(stackTokens(0, [5, 3, 1])).toEqual([]);
    expect(stackTokens(-2, [3, 1])).toEqual([]);
  });
});
