import { describe, expect, it } from "vitest";
import { compose, composeScript } from "../api";
import type { GameContext, HookRun, ScriptHooks } from "../world/types";

const game = {} as GameContext;
const run = {} as HookRun;

describe("compose(base, extra): a Return-to scenario's hooks over its base's", () => {
  it("runs setup base then extra, and checkObjectives and ended extra then base", () => {
    const order: string[] = [];
    const base: Partial<ScriptHooks> = {
      setup: () => void order.push("base.setup"),
      checkObjectives: () => void order.push("base.check"),
      ended: () => void order.push("base.ended"),
    };
    const extra: Partial<ScriptHooks> = {
      setup: () => void order.push("extra.setup"),
      checkObjectives: () => void order.push("extra.check"),
      ended: () => void order.push("extra.ended"),
    };
    const h = compose(base, extra);
    h.setup!(game, run);
    h.checkObjectives!(game);
    h.ended!(game, true);
    expect(order).toEqual([
      "base.setup",
      "extra.setup",
      "extra.check",
      "base.check",
      "extra.ended",
      "base.ended",
    ]);
  });

  it("spawnRedirect asks extra first and falls back to base", () => {
    const h = compose(
      { spawnRedirect: () => "base-loc" },
      { spawnRedirect: (_g, e) => (e === "x" ? "extra-loc" : null) },
    );
    expect(h.spawnRedirect!(game, "x")).toBe("extra-loc");
    expect(h.spawnRedirect!(game, "y")).toBe("base-loc");
  });

  it("healHorror lowers the heal through both", () => {
    const h = compose(
      { healHorror: (_g, _r, _t, n) => n - 1 },
      { healHorror: (_g, _r, _t, n) => n - 2 },
    );
    expect(h.healHorror!(game, run, "t", 5)).toBe(2);
  });

  it("keeps every hook the base has, and adds the extra's", () => {
    const base: Partial<ScriptHooks> = { checkObjectives: () => {}, gameEnd: () => {} };
    const extra: Partial<ScriptHooks> = { setup: () => {} };
    expect(Object.keys(compose(base, extra)).sort()).toEqual([
      "checkObjectives",
      "gameEnd",
      "setup",
    ]);
  });

  it("composeScript keeps the base's functions and conditions beside the extra's, and composes the hooks", () => {
    const order: string[] = [];
    const s = composeScript(
      {
        fns: { a: () => {}, shared: () => void order.push("base.fn") },
        conditions: { c: () => true },
        hooks: { setup: () => void order.push("base.setup") },
      },
      {
        fns: { b: () => {}, shared: () => void order.push("extra.fn") },
        hooks: { setup: () => void order.push("extra.setup") },
      },
    );
    expect(Object.keys(s.fns!).sort()).toEqual(["a", "b", "shared"]);
    expect(Object.keys(s.conditions!)).toEqual(["c"]);
    s.fns!.shared(game, run as never);
    s.hooks!.setup!(game, run);
    expect(order).toEqual(["extra.fn", "base.setup", "extra.setup"]);
  });
});
