import { describe, expect, it } from "vitest";
import { botChoice } from "../engine/bot";
import { dispatch, replay } from "../engine/engine";
import { db, setup, start } from "../engine/testkit";
import type { Action } from "../engine/types";
import { breakdownRows } from "./tokenDraw";

describe("chaos token draw", () => {
  it("breakdown: success with a committed icon", () => {
    expect(breakdownRows({ skill: "intellect", base: 3, icons: 1, tokens: ["-1"], tokenTotal: -1, total: 3, difficulty: 2, success: true })).toEqual([
      { kind: "skill", skill: "intellect", value: 3 },
      { kind: "committed", value: 1 },
      { kind: "tokens", tokens: ["-1"], value: -1, autoFail: false },
      { kind: "total", value: 3, difficulty: 2 },
      { kind: "result", success: true },
    ]);
  });

  it("breakdown: fail without commits, auto-fail, and two tokens", () => {
    const fail = breakdownRows({ skill: "combat", base: 2, icons: 0, tokens: ["-3"], tokenTotal: -3, total: -1, difficulty: 4, success: false });
    expect(fail.map((r) => r.kind)).toEqual(["skill", "tokens", "total", "result"]);
    expect(fail.at(-1)).toEqual({ kind: "result", success: false });
    const auto = breakdownRows({ skill: "agility", base: 4, icons: 0, tokens: ["autoFail"], tokenTotal: 0, total: 0, difficulty: 1, success: false });
    expect(auto[1]).toMatchObject({ kind: "tokens", autoFail: true });
    const two = breakdownRows({ skill: "willpower", base: 3, icons: 0, tokens: ["skull", "-2"], tokenTotal: -3, total: 0, difficulty: 2, success: false });
    expect(two[1]).toEqual({ kind: "tokens", tokens: ["skull", "-2"], value: -3, autoFail: false });
  });

  it("which circle is clicked can't matter: a replayed game reveals the same tokens", () => {
    const invs = ["01001", "01002"];
    let r = start("the-gathering", invs, 9);
    const actions: Action[] = [];
    for (let k = 0; k < 120 && r.state.pending; k++) {
      const a: Action = { type: "choose", inv: r.state.pending.inv, option: botChoice(db, r) };
      actions.push(a);
      r = dispatch(db, r.state, a);
    }
    const tokens = (log: { type: string; text: string }[]) => log.filter((e) => e.type === "token").map((e) => e.text);
    const first = tokens(r.state.log);
    expect(first.length).toBeGreaterThan(0);
    const again = replay(db, setup("the-gathering", invs, 9), actions);
    expect(tokens(again.state.log)).toEqual(first);
  });
});
