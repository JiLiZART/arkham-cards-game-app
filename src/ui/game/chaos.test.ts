import { describe, expect, it } from "vitest";
import { db, start } from "../../engine/testkit";
import { averageModifier, groupTokens } from "./chaos";

describe("chaos bag grouping", () => {
  it("The Gathering on Standard", () => {
    const r = start("the-gathering", ["01001"], 1);
    expect(groupTokens(r.state.chaosBag)).toEqual([
      ["+1", 1],
      ["0", 2],
      ["-1", 3],
      ["-2", 2],
      ["-3", 1],
      ["-4", 1],
      ["skull", 2],
      ["cultist", 1],
      ["tablet", 1],
      ["autoFail", 1],
      ["elderSign", 1],
    ]);
    expect(db.campaigns["night-of-the-zealot"].chaosBags.standard).toHaveLength(16);
  });
  it("unknown tokens go last", () => {
    expect(groupTokens(["frost", "-1", "skull", "-1"])).toEqual([
      ["-1", 2],
      ["skull", 1],
      ["frost", 1],
    ]);
  });
});

describe("average modifier", () => {
  it("averages the numeric tokens and leaves the symbols out", () => {
    expect(averageModifier(["+1", "-1", "skull", "autoFail"])).toBe(0);
    expect(averageModifier(["-2", "-4", "elderSign"])).toBe(-3);
  });
  it("is 0 for a bag with no numbers", () => {
    expect(averageModifier(["skull", "cultist"])).toBe(0);
    expect(averageModifier([])).toBe(0);
  });
  it("the four Night of the Zealot bags, as the data gives them", () => {
    const bags = db.campaigns["night-of-the-zealot"].chaosBags;
    expect(
      (["easy", "standard", "hard", "expert"] as const).map((d) =>
        averageModifier(bags[d] ?? []).toFixed(1),
      ),
    ).toEqual(["-0.5", "-1.3", "-1.9", "-3.3"]);
  });
});
