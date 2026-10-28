import { beforeAll, describe, expect, it } from "vitest";
import { loadCampaign, loadPack } from "../content";
import { dispatch } from "./engine";
import { next } from "./rng";
import { db, start } from "./testkit";

/**
 * Every generated scenario (ADR-0007) sets up and survives three rounds of random play: the engine never throws or
 * dead-locks on cards that have no written behaviour.
 */
const generated = Object.values(db.campaigns)
  .filter((c) => c.generated)
  .flatMap((c) => c.scenarios.map((s) => ({ campaign: c.id, scenario: s })));

describe("generated scenarios", () => {
  beforeAll(async () => {
    for (const pack of Object.keys(db.packs)) expect(await loadPack(pack)).toEqual([]);
    for (const { campaign } of generated) expect(await loadCampaign(campaign)).toEqual([]);
  }, 60_000);

  it("there are generated campaigns to play", () => {
    expect(generated.length).toBeGreaterThan(100);
  });

  for (const { campaign, scenario } of generated) {
    it(`${campaign} / ${scenario}`, () => {
      let r = start(scenario, ["01001", "01002"], 1, { campaignId: campaign });
      expect(r.state.act).not.toBeNull();
      expect(r.state.agenda).not.toBeNull();
      const rng = { rng: 7919 };
      for (let steps = 0; r.state.pending && r.state.round <= 3 && steps < 1500; steps++) {
        const p = r.state.pending;
        const end = p.options.find((o) => o.label === "End turn");
        const o =
          end && next(rng) < 0.3 ? end : p.options[Math.floor(next(rng) * p.options.length)];
        const res = dispatch(db, r.state, { type: "choose", inv: p.inv, option: o.id });
        if (res.error) throw new Error(res.error);
        r = res;
      }
      expect(r.state.phase === "ended" || r.state.pending).toBeTruthy();
    });
  }
});
