import { beforeAll, describe, expect, it } from "vitest";
import { loadCampaign } from "../../../content";
import { db } from "../../kits/testkit";
import { startCampaign } from "../campaign";
import { advance, startResolution } from "../flow";
import type { CampaignState } from "../types";

const ROLAND = "01001";
const begin = (campaignId: string) =>
  startCampaign(db, {
    campaignId,
    difficulty: "standard",
    seed: 1,
    investigators: [{ code: ROLAND, deckId: "roland-starter" }],
  });
/** the order jumps to `scenario` (as a "next scenario" step would send it), then it is played */
const playing = (c0: CampaignState, scenario: string) => {
  const c = advance(db, {
    ...c0,
    flow: { ...c0.flow, waiting: null, play: null, queue: [], shown: [], override: scenario },
  });
  expect(c.flow.waiting?.step).toMatchObject({ kind: "play", scenario });
  return advance(db, c, "play");
};
/** the scenario ends with `resolution`; the flow then runs, answering each prompt with its first choice, until `stop` */
const ended = (
  c0: CampaignState,
  scenario: string,
  resolution: string,
  stop: (c: CampaignState) => boolean,
) => {
  let c = startResolution(db, c0, {
    id: scenario,
    resolution,
    victory: 0,
    victoryCodes: [],
    cultistsVictory: [],
    cultistsRemaining: [],
    notResigned: [c0.lead],
  });
  for (let k = 0; k < 40 && c.flow.waiting && !stop(c); k++) {
    const st = c.flow.waiting.step;
    c = advance(
      db,
      c,
      st.kind === "chooseOne"
        ? st.choices[0].id
        : st.kind === "counter"
          ? st.min
          : st.kind === "investigator" || st.kind === "investigatorChoice"
            ? c.investigators[0].code
            : "continue",
    );
  }
  return c;
};
const entries = (c: CampaignState, section: string) =>
  c.log[section]?.entries.map((e) => e.id) ?? [];

describe("the compiled flows, played through the campaign runner", () => {
  beforeAll(async () => {
    for (const id of ["the-feast-of-hemlock-vale", "the-path-to-carcosa", "the-dunwich-legacy"])
      await loadCampaign(id);
  });

  it("Hemlock Vale: Written in Rock ended on Day 1 moves to Night 1 and The First Evening", () => {
    const start = begin("the-feast-of-hemlock-vale");
    expect(start.log.hidden.counts.day).toBe(1);
    const c = ended(
      playing(start, "written-in-rock"),
      "written-in-rock",
      "R1",
      (x) => x.flow.item === "the-first-evening",
    );
    expect(c.log.hidden.counts.day).toBe(2);
    expect(entries(c, "hidden")).toContain("day1Night");
    expect(c.flow.item).toBe("the-first-evening");
  });

  it("Carcosa: a new campaign shows the prologue and plays Curtain Call first", () => {
    let c = begin("the-path-to-carcosa");
    for (let k = 0; k < 20 && c.flow.waiting?.step.kind !== "play"; k++) {
      const st = c.flow.waiting!.step;
      c = advance(db, c, st.kind === "chooseOne" ? st.choices[0].id : "continue");
    }
    expect(c.history).toEqual([]);
    expect(c.flow.waiting?.step).toMatchObject({ kind: "play", scenario: "curtain-call" });
  });

  it("The House Always Wins ended with no resolution records that the O'Bannion gang has a bone to pick", () => {
    const c = ended(
      playing(begin("the-dunwich-legacy"), "the-house-always-wins"),
      "the-house-always-wins",
      "none",
      () => false,
    );
    expect(entries(c, "campaign_notes")).toContain("boneToPick");
  });
});
