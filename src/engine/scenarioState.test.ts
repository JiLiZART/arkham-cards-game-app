import { describe, expect, it } from "vitest";
import {
  activeInvestigator,
  bumpCounter,
  cancelEvent,
  endScenario,
  isCancelled,
  limitUses,
  logLength,
  nextKey,
  pacesPhases,
  periodCounter,
  recordLimitUse,
  scenarioIdOf,
  setActive,
  setLead,
  setPhase,
  startRound,
  type G,
} from "./core";
import { gOf, skipMulligans, start } from "./testkit";

const R = "01001";
const D = "01002";
const fresh = (): G => gOf(skipMulligans(start("the-gathering", [R, D], 1)));

describe("scenario state functions", () => {
  it("read the active investigator, the scenario, the log length and whether phases pace", () => {
    const g = fresh();
    expect(activeInvestigator(g)).toBe(g.s.active);
    expect(scenarioIdOf(g)).toBe("the-gathering");
    expect(logLength(g)).toBe(g.s.log.length);
    expect(pacesPhases(g)).toBe(!!g.s.pacePhases);
  });

  it("mint event keys from one counter: each key is new", () => {
    const g = fresh();
    const seq = g.s.seq;
    expect(nextKey(g, "atk")).toBe(`atk${seq}`);
    expect(nextKey(g, "dmg")).toBe(`dmg${seq + 1}`);
    expect(g.s.seq).toBe(seq + 2);
  });

  it("note a cancelled event and ask whether one was", () => {
    const g = fresh();
    expect(isCancelled(g, "atk1")).toBe(false);
    cancelEvent(g, "atk1");
    expect(isCancelled(g, "atk1")).toBe(true);
  });

  it("count a limited ability's uses by period, and the periods' counters advance", () => {
    const g = fresh();
    expect(limitUses(g, "01016:0:round1")).toBe(0);
    recordLimitUse(g, "01016:0:round1");
    recordLimitUse(g, "01016:0:round1");
    expect(limitUses(g, "01016:0:round1")).toBe(2);
    const turn = periodCounter(g, "turn");
    bumpCounter(g, "turn");
    expect(periodCounter(g, "turn")).toBe(turn + 1);
  });

  it("set the phase (a new phase counter), the active investigator and the lead; start a round", () => {
    const g = fresh();
    const phases = periodCounter(g, "phase");
    setPhase(g, "enemy");
    expect(g.s.phase).toBe("enemy");
    expect(periodCounter(g, "phase")).toBe(phases + 1);
    setActive(g, D);
    expect(g.s.active).toBe(D);
    setActive(g, null);
    expect(g.s.active).toBeNull();
    setLead(g, D);
    expect(g.s.lead).toBe(D);
    const round = g.s.round;
    const rounds = periodCounter(g, "round");
    startRound(g);
    expect(g.s.round).toBe(round + 1);
    expect(periodCounter(g, "round")).toBe(rounds + 1);
  });

  it("end the scenario: the phase, the resolution, and nothing left to do", () => {
    const g = fresh();
    g.s.queue.push({ t: "StartRound" });
    endScenario(g, "R1");
    expect(g.s).toMatchObject({ phase: "ended", resolution: "R1", queue: [], pending: null });
  });
});
