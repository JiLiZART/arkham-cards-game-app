import { describe, expect, it } from "vitest";
import { currentTest } from "../context";
import { addExtraReveal, flipNegativeTokens, forceResult, setOnChoose } from "../rules/skillTest";
import { gOf, pick, skipMulligans, start } from "../kits/testkit";

const R = "01001";
const testing = () => gOf(pick(skipMulligans(start("the-gathering", [R], 1)), "Investigate Study"));

describe("skill test setters", () => {
  it("change the test under way", () => {
    const game = testing();
    expect(currentTest(game)).not.toBeNull();
    addExtraReveal(game);
    addExtraReveal(game);
    flipNegativeTokens(game);
    forceResult(game, "succeed");
    setOnChoose(game, "12068", "symbol");
    expect(currentTest(game)).toMatchObject({
      extraReveal: 2,
      flipNegative: true,
      autoSucceed: true,
      onChoose: { code: "12068", fn: "symbol" },
    });
    forceResult(game, "fail");
    expect(currentTest(game)!.autoFail).toBe(true);
  });

  it("do nothing when no test is under way", () => {
    const game = gOf(skipMulligans(start("the-gathering", [R], 1)));
    expect(currentTest(game)).toBeNull();
    addExtraReveal(game);
    forceResult(game, "fail");
    expect(currentTest(game)).toBeNull();
  });
});
