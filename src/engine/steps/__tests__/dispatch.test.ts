import { describe, expect, it } from "vitest";
import { db, start } from "../../kits/testkit";
import type { GameContext, Step } from "../../world/types";
import { run, type StepHandlers } from "../dispatch";

// @ts-expect-error a step kind without a handler is refused
const noHandlers: StepHandlers = {};
type MoveStep = Extract<Step, { t: "Move" }>;
// @ts-expect-error a handler takes the step kind it is registered for
const wrongStep: Partial<StepHandlers> = { Draw: (_game: GameContext, _step: MoveStep) => {} };

describe("the step dispatch", () => {
  it("has a handler for every step kind, each taking its own kind of step (checked by the compiler)", () => {
    expect([noHandlers, wrongStep]).toHaveLength(2);
  });

  it("a queued step of a kind nobody handles stops the engine with its name", () => {
    const game: GameContext = {
      s: structuredClone(start("the-gathering", ["01001"]).state),
      db,
      events: [],
    };
    game.s.pending = null;
    game.s.queue.push({ t: "Nope" } as unknown as Step);
    expect(() => run(game)).toThrow("no handler for step Nope");
  });

  it("the engine's deferred rules are step kinds: a Script step naming __engine is a missing script", () => {
    const game: GameContext = {
      s: structuredClone(start("the-gathering", ["01001"]).state),
      db,
      events: [],
    };
    game.s.pending = null;
    game.s.queue.push({ t: "Script", code: "__engine", fn: "revealLocation", ctx: {} });
    expect(() => run(game)).toThrow("missing script function __engine.revealLocation");
  });

  it("a deferred rule's step carries its fields (checked by the compiler)", () => {
    // @ts-expect-error a location's reveal names the location
    const noLocation: Step = { t: "RevealLocation" };
    // @ts-expect-error a basic fight carries its context
    const noCtx: Step = { t: "BasicFight" };
    expect([noLocation, noCtx]).toHaveLength(2);
  });
});
