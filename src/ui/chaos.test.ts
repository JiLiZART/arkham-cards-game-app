import { describe, expect, it } from "vitest";
import { db, start } from "../engine/testkit";
import { groupTokens } from "./chaos";

describe("chaos bag grouping", () => {
  it("The Gathering on Standard", () => {
    const r = start("the-gathering", ["01001"], 1);
    expect(groupTokens(r.state.chaosBag)).toEqual([
      ["+1", 1], ["0", 2], ["-1", 3], ["-2", 2], ["-3", 1], ["-4", 1],
      ["skull", 2], ["cultist", 1], ["tablet", 1], ["autoFail", 1], ["elderSign", 1],
    ]);
    expect(db.campaigns["night-of-the-zealot"].chaosBags.standard).toHaveLength(16);
  });
  it("unknown tokens go last", () => {
    expect(groupTokens(["frost", "-1", "skull", "-1"])).toEqual([["-1", 2], ["skull", 1], ["frost", 1]]);
  });
});
