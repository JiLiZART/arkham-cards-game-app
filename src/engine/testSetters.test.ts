import { describe, expect, it } from "vitest";
import { addExtraReveal, flipNegativeTokens, forceResult, setOnChoose } from "./rules/skillTest";
import { gOf, pick, skipMulligans, start } from "./testkit";

const R = "01001";
const testing = () => gOf(pick(skipMulligans(start("the-gathering", [R], 1)), "Investigate Study"));

describe("skill test setters", () => {
  it("change the test under way", () => {
    const g = testing();
    expect(g.s.skillTest).not.toBeNull();
    addExtraReveal(g);
    addExtraReveal(g);
    flipNegativeTokens(g);
    forceResult(g, "succeed");
    setOnChoose(g, "12068", "symbol");
    expect(g.s.skillTest).toMatchObject({
      extraReveal: 2,
      flipNegative: true,
      autoSucceed: true,
      onChoose: { code: "12068", fn: "symbol" },
    });
    forceResult(g, "fail");
    expect(g.s.skillTest!.autoFail).toBe(true);
  });

  it("do nothing when no test is under way", () => {
    const g = gOf(skipMulligans(start("the-gathering", [R], 1)));
    expect(g.s.skillTest).toBeNull();
    addExtraReveal(g);
    forceResult(g, "fail");
    expect(g.s.skillTest).toBeNull();
  });
});
