import { describe, expect, it } from "vitest";
import { botChoice } from "../../engine/bot";
import { dispatch, replay } from "../../engine/engine";
import { db, setup, start } from "../../engine/testkit";
import type { Action } from "../../engine/types";

describe("chaos token draw", () => {
  it("which circle is clicked can't matter: a replayed game reveals the same tokens", () => {
    const invs = ["01001", "01002"];
    let r = start("the-gathering", invs, 9);
    const actions: Action[] = [];
    for (let k = 0; k < 120 && r.state.pending; k++) {
      const a: Action = { type: "choose", inv: r.state.pending.inv, option: botChoice(db, r) };
      actions.push(a);
      r = dispatch(db, r.state, a);
    }
    const tokens = (log: { type: string; text: string }[]) =>
      log.filter((e) => e.type === "token").map((e) => e.text);
    const first = tokens(r.state.log);
    expect(first.length).toBeGreaterThan(0);
    const again = replay(db, setup("the-gathering", invs, 9), actions);
    expect(tokens(again.state.log)).toEqual(first);
  });
});
