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
  type GameContext,
} from "../context";
import { gOf, skipMulligans, start } from "../kits/testkit";
import { PHASE } from "../world/constants";
import { STEP } from "../steps/step";

const R = "01001";
const D = "01002";
const fresh = (): GameContext => gOf(skipMulligans(start("the-gathering", [R, D], 1)));

describe("scenario state functions", () => {
  it("read the active investigator, the scenario, the log length and whether phases pace", () => {
    const game = fresh();
    expect(activeInvestigator(game)).toBe(game.s.active);
    expect(scenarioIdOf(game)).toBe("the-gathering");
    expect(logLength(game)).toBe(game.s.log.length);
    expect(pacesPhases(game)).toBe(!!game.s.pacePhases);
  });

  it("mint event keys from one counter: each key is new", () => {
    const game = fresh();
    const seq = game.s.seq;
    expect(nextKey(game, "atk")).toBe(`atk${seq}`);
    expect(nextKey(game, "dmg")).toBe(`dmg${seq + 1}`);
    expect(game.s.seq).toBe(seq + 2);
  });

  it("note a cancelled event and ask whether one was", () => {
    const game = fresh();
    expect(isCancelled(game, "atk1")).toBe(false);
    cancelEvent(game, "atk1");
    expect(isCancelled(game, "atk1")).toBe(true);
  });

  it("count a limited ability's uses by period, and the periods' counters advance", () => {
    const game = fresh();
    expect(limitUses(game, "01016:0:round1")).toBe(0);
    recordLimitUse(game, "01016:0:round1");
    recordLimitUse(game, "01016:0:round1");
    expect(limitUses(game, "01016:0:round1")).toBe(2);
    const turn = periodCounter(game, "turn");
    bumpCounter(game, "turn");
    expect(periodCounter(game, "turn")).toBe(turn + 1);
  });

  it("set the phase (a new phase counter), the active investigator and the lead; start a round", () => {
    const game = fresh();
    const phases = periodCounter(game, "phase");
    setPhase(game, PHASE.Enemy);
    expect(game.s.phase).toBe("enemy");
    expect(periodCounter(game, "phase")).toBe(phases + 1);
    setActive(game, D);
    expect(game.s.active).toBe(D);
    setActive(game, null);
    expect(game.s.active).toBeNull();
    setLead(game, D);
    expect(game.s.lead).toBe(D);
    const round = game.s.round;
    const rounds = periodCounter(game, "round");
    startRound(game);
    expect(game.s.round).toBe(round + 1);
    expect(periodCounter(game, "round")).toBe(rounds + 1);
  });

  it("end the scenario: the phase, the resolution, and nothing left to do", () => {
    const game = fresh();
    game.s.queue.push({ t: STEP.StartRound });
    endScenario(game, "R1");
    expect(game.s).toMatchObject({ phase: "ended", resolution: "R1", queue: [], pending: null });
  });
});
