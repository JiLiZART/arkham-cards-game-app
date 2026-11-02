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
});
