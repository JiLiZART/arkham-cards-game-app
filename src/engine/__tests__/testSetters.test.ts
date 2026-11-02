import { describe, expect, it } from "vitest";
import { addExtraReveal, flipNegativeTokens, forceResult, setOnChoose } from "../rules/skillTest";
import { gOf, pick, skipMulligans, start } from "../kits/testkit";

const R = "01001";
const testing = () => gOf(pick(skipMulligans(start("the-gathering", [R], 1)), "Investigate Study"));

describe("skill test setters", () => {
  it("change the test under way", () => {
    const game = testing();
    expect(game.s.skillTest).not.toBeNull();
    addExtraReveal(game);
    addExtraReveal(game);
    flipNegativeTokens(game);
    forceResult(game, "succeed");
    setOnChoose(game, "12068", "symbol");
    expect(game.s.skillTest).toMatchObject({
      extraReveal: 2,
      flipNegative: true,
      autoSucceed: true,
      onChoose: { code: "12068", fn: "symbol" },
    });
    forceResult(game, "fail");
    expect(game.s.skillTest!.autoFail).toBe(true);
  });

  it("do nothing when no test is under way", () => {
    const game = gOf(skipMulligans(start("the-gathering", [R], 1)));
    expect(game.s.skillTest).toBeNull();
    addExtraReveal(game);
    forceResult(game, "fail");
    expect(game.s.skillTest).toBeNull();
  });
});
