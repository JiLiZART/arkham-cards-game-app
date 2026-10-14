import { describe, expect, it } from "vitest";
import { dispatch } from "./engine";
import { next } from "./rng";
import { db, start } from "./testkit";

/** play random legal choices; the engine must never throw or dead-lock */
function randomPlay(scenario: string, invs: string[], seed: number, maxSteps = 3000) {
  let r = start(scenario, invs, seed);
  const rng = { rng: seed * 7919 };
  let steps = 0;
  while (r.state.pending && steps++ < maxSteps) {
    const p = r.state.pending;
    // bias toward ending turns so games progress
    const end = p.options.find((o) => o.label === "End turn");
    const o = end && next(rng) < 0.25 ? end : p.options[Math.floor(next(rng) * p.options.length)];
    const res = dispatch(db, r.state, { type: "choose", inv: p.inv, option: o.id });
    if (res.error) throw new Error(res.error);
    r = res;
  }
  return r;
}

describe("random play", () => {
  for (const [scenario, invs] of [
    ["the-gathering", ["01001", "01004"]],
    ["the-gathering", ["01002", "01003", "01005"]],
    ["the-midnight-masks", ["01001", "01002", "01003", "01004"]],
    ["the-devourer-below", ["01005", "01001"]],
  ] as const) {
    for (const seed of [1, 2, 3, 4, 5]) {
      it(`${scenario} ${invs.join("+")} seed ${seed}`, () => {
        const r = randomPlay(scenario, [...invs], seed);
        expect(r.state.phase === "ended" || r.state.pending).toBeTruthy();
      });
    }
  }
});
