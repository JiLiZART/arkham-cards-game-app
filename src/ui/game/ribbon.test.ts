import { describe, expect, it } from "vitest";
import { skipMulligans, start } from "../../engine/testkit";
import type { GameState } from "../../engine/types";
import { ribbonModel } from "./ribbon";

const two = skipMulligans(start("the-gathering", ["01001", "01002"], 1)).state;
const at = (patch: Partial<GameState>, inv: (s: GameState) => void = () => {}) => {
  const s = structuredClone(two);
  Object.assign(s, patch);
  inv(s);
  return s;
};
const states = (s: GameState) => ribbonModel(s).phases.map((p) => p.state);

describe("ribbonModel", () => {
  it("round 1: mythos skipped, investigation lit", () => {
    expect(states(at({ round: 1, phase: "investigation" }))).toEqual([
      "skipped",
      "current",
      "todo",
      "todo",
    ]);
  });

  it("round 2 enemy phase: mythos and investigation done, enemy lit, upkeep to come", () => {
    const m = ribbonModel(at({ round: 2, phase: "enemy" }));
    expect(m.round).toBe(2);
    expect(m.phases.map((p) => p.state)).toEqual(["done", "done", "current", "todo"]);
    // outside the investigation phase only the portraits
    expect(m.turns.map((t) => [t.state, t.pips])).toEqual([
      ["idle", 0],
      ["idle", 0],
    ]);
  });

  it("the pause before a phase lights that phase", () => {
    const s = at(
      { round: 2, phase: "upkeep" },
      (s) =>
        (s.pending = { ...s.pending!, kind: "phase", step: { t: "PhasePause", phase: "mythos" } }),
    );
    expect(states(s)).toEqual(["current", "todo", "todo", "todo"]);
  });

  it("the pause before the investigation phase shows everyone still to play", () => {
    const s = at({ round: 2, phase: "mythos", active: null }, (s) => {
      s.pending = {
        ...s.pending!,
        kind: "phase",
        step: { t: "PhasePause", phase: "investigation" },
      };
      for (const i of s.order) s.invs[i].turnDone = true;
    });
    expect(ribbonModel(s).turns.map((t) => t.state)).toEqual(["todo", "todo"]);
  });

  it("setup and the end", () => {
    expect(ribbonModel(at({ phase: "setup" })).stage).toBe("setup");
    expect(ribbonModel(at({ phase: "ended" })).stage).toBe("ended");
  });

  it("turns: active with its actions left, done dimmed and empty, to play full", () => {
    const s = at({ phase: "investigation", active: "01002" }, (s) => {
      s.invs["01001"].turnDone = true;
      s.invs["01002"].actionsLeft = 2;
    });
    expect(ribbonModel(s).turns).toEqual([
      { inv: "01001", state: "done", pips: 3, filled: 0 },
      { inv: "01002", state: "active", pips: 3, filled: 2 },
    ]);
    const todo = at(
      { phase: "investigation", active: "01001" },
      (s) => (s.invs["01001"].actionsLeft = 3),
    );
    expect(ribbonModel(todo).turns[1]).toEqual({ inv: "01002", state: "todo", pips: 3, filled: 3 });
  });

  it("an extra action (or a restricted one) adds a pip", () => {
    const s = at({ phase: "investigation", active: "01002" }, (s) => {
      s.invs["01002"].actionsLeft = 3;
      s.invs["01002"].restrictedActions = [{ trait: "Tome", left: 1 }];
    });
    expect(ribbonModel(s).turns[1]).toMatchObject({ pips: 4, filled: 4 });
  });

  it("a resigned investigator is left out", () => {
    const s = at({ phase: "investigation" }, (s) => (s.invs["01001"].status = "resigned"));
    expect(ribbonModel(s).turns.map((t) => t.inv)).toEqual(["01002"]);
  });
});
