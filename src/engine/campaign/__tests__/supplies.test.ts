/** Supplies in the campaign log and the flow (engine-tfa-supplies-vengeance-exploration group 2; ADR-0053). */
import { describe, expect, it } from "vitest";
import { CampaignDef, CampaignFlow } from "../../../content/schema";
import { applyScenarioEnd, migrateCampaign, scenarioSetup, startCampaign } from "../campaign";
import type { CampaignState } from "../types";
import { addSupply, crossOffSupply, emptyLog, hasEntry, hasSupply, supplyCount } from "../log";
import { advance, startResolution, test } from "../flow";
import { db as base, gOf, skipMulligans } from "../../kits/testkit";
import { inject, toTurn } from "../../kits/driver";
import { createGame } from "../../index";
import { checkCondition } from "../../queries";
import { STEP } from "../../steps/step";
import { LOG_SECTION_KINDS } from "../../../content/schema";

const ROLAND = "01001";
const AGNES = "01004";
const DAISY = "01002";
const SKIDS = "01003";
const DECKS: Record<string, string> = {
  [ROLAND]: "roland-starter",
  [AGNES]: "agnes-starter",
  [DAISY]: "daisy-starter",
  [SKIDS]: "skids-starter",
};
const NOTZ = base.campaigns["night-of-the-zealot"];
const GATHERING = "the-gathering";

const flowDb = (flow: object) => ({
  ...base,
  campaigns: {
    ...base.campaigns,
    t: CampaignDef.parse({
      id: "t",
      name: "T",
      scenarios: NOTZ.scenarios,
      chaosBags: NOTZ.chaosBags,
      logSections: [
        { id: "campaign_notes", kind: "entries", label: "Notes" },
        { id: "supplies", kind: "supplies", label: "Supplies" },
      ],
    }),
  },
  flows: { ...base.flows, t: CampaignFlow.parse(flow) },
});
type Db = ReturnType<typeof flowDb>;
const begin = (db: Db, who: string[]) =>
  startCampaign(db, {
    campaignId: "t",
    difficulty: "standard",
    seed: 7,
    investigators: who.map((code) => ({ code, deckId: DECKS[code] })),
  });
const story = (text: string) => ({ kind: "story", text });
const record = (key: string) => ({ kind: "effects", effects: [{ do: "record", key }] });
const SUPPLY_POINT_1 = {
  kind: "buySupplies",
  points: [10, 7, 5, 4],
  list: [
    { id: "provisions", cost: 1, multiple: true },
    { id: "medicine", cost: 2, multiple: true },
    { id: "rope", cost: 3 },
    { id: "blanket", cost: 2 },
    { id: "canteen", cost: 2 },
    { id: "torches", cost: 3 },
    { id: "compass", cost: 2 },
    { id: "map", cost: 3 },
    { id: "binoculars", cost: 2 },
    { id: "chalk", cost: 2 },
    { id: "pendant", cost: 1 },
  ],
};
/** a flow whose setup runs `steps`, then plays The Gathering */
const flowOf = (steps: Record<string, object>, setup = Object.keys(steps)) => ({
  setup,
  order: [GATHERING],
  steps: { ...steps, rations: story("Low on Rations"), ok: story("ok") },
});
/** a flow with no setup of its own: the test queues the steps once the supplies are set */
const checks = (steps: Record<string, object>) => flowDb(flowOf(steps, []));
/** the campaign with each investigator's supplies set first, `queue` to run */
const withSupplies = (
  db: Db,
  who: string[],
  supplies: Record<string, string[]>,
  queue = Object.keys(db.flows.t.steps).slice(0, 1),
): CampaignState => {
  const c = begin(db, who);
  let log = c.log;
  for (const [inv, list] of Object.entries(supplies))
    for (const s of list) log = addSupply(log, inv, s);
  return { ...c, log, flow: { ...c.flow, waiting: null, queue } };
};
const run = (c: CampaignState, db: Db) => advance(db, c);

describe("the supplies section of the log (2.1)", () => {
  it("adds, crosses off and reads supplies per investigator", () => {
    expect(LOG_SECTION_KINDS).toContain("supplies");
    let log = addSupply(emptyLog(), ROLAND, "provisions", 2);
    log = addSupply(log, AGNES, "rope");
    expect(supplyCount(log, ROLAND, "provisions")).toBe(2);
    expect(hasSupply(log, "any", "rope")).toBe(true);
    expect(hasSupply(log, ROLAND, "rope")).toBe(false);
    log = crossOffSupply(log, AGNES, "rope");
    expect(hasSupply(log, "any", "rope")).toBe(false);
    log = crossOffSupply(log, ROLAND, "provisions");
    expect(supplyCount(log, ROLAND, "provisions")).toBe(1);
  });
});

describe("buying supplies (2.2)", () => {
  it("each of 4 investigators buys at 4 points, and no more", () => {
    const db = flowDb(flowOf({ buy: SUPPLY_POINT_1 }));
    let c = begin(db, [ROLAND, AGNES, DAISY, SKIDS]);
    expect(c.flow.waiting?.step).toMatchObject({ kind: "buySupplies", inv: ROLAND });
    expect(() => advance(db, c, ["rope", "provisions", "provisions"])).toThrow(/supply points/);
    expect(() => advance(db, c, ["rope", "rope"])).toThrow(/once/);
    c = advance(db, c, ["rope", "provisions"]);
    expect(c.flow.waiting?.step).toMatchObject({ kind: "buySupplies", inv: AGNES });
    c = advance(db, c, ["provisions", "provisions", "medicine"]);
    c = advance(db, c, []);
    c = advance(db, c, ["map", "pendant"]);
    expect(c.flow.waiting?.step.kind).toBe("play");
    expect(supplyCount(c.log, ROLAND, "rope")).toBe(1);
    expect(supplyCount(c.log, AGNES, "provisions")).toBe(2);
    expect(hasSupply(c.log, DAISY, "provisions")).toBe(false);
    expect(supplyCount(c.log, SKIDS, "map")).toBe(1);
  });

  it("with an experience rate, points beyond the budget cost experience, up to the limit", () => {
    const db = flowDb(flowOf({ buy: { ...SUPPLY_POINT_1, points: [1], xpRate: 2, xpMax: 4 } }));
    let c = begin(db, [ROLAND]);
    c = { ...c, investigators: c.investigators.map((i) => ({ ...i, xp: 5 })) };
    // rope (3) and map (3): 5 points over, 10 experience; more than the limit of 4
    expect(() => advance(db, c, ["rope", "map"])).toThrow(/supply points/);
    c = advance(db, c, ["rope"]);
    expect(c.investigators[0].xp).toBe(1);
    expect(supplyCount(c.log, ROLAND, "rope")).toBe(1);
  });

  it("record: false keeps them for the next scenario only", () => {
    const db = flowDb(flowOf({ buy: { ...SUPPLY_POINT_1, section: "relics", record: false } }));
    let c = advance(db, begin(db, [ROLAND]), ["rope"]);
    expect(supplyCount(c.log, ROLAND, "rope", "relics")).toBe(1);
    c = startResolution(db, c, {
      id: GATHERING,
      resolution: "none",
      victory: 0,
      victoryCodes: [],
      cultistsVictory: [],
      cultistsRemaining: [],
      notResigned: [ROLAND],
    });
    expect(c.log.relics).toBeUndefined();
  });
});

describe("checking and crossing off supplies (2.2)", () => {
  it("provisions: each investigator crosses one off; Low on Rations for each who has none", () => {
    const steps = {
      eat: {
        kind: "crossOffSupply",
        supply: "provisions",
        who: "each",
        missing: { steps: ["rations"], effects: [{ do: "record", key: "hungry" }] },
      },
    };
    const db = checks(steps);
    const c = run(
      withSupplies(db, [ROLAND, AGNES, DAISY], {
        [ROLAND]: ["provisions", "provisions"],
        [AGNES]: ["provisions"],
      }),
      db,
    );
    expect(supplyCount(c.log, ROLAND, "provisions")).toBe(1);
    expect(supplyCount(c.log, AGNES, "provisions")).toBe(0);
    // read once, its effect once per investigator without: Daisy
    expect(c.flow.shown.filter((s) => "story" in s && s.story === "rations")).toHaveLength(1);
    expect(hasEntry(c.log, "hungry")).toBe(true);
  });

  it("gasoline: one investigator who has it uses it; Out of Gas when nobody has", () => {
    const steps = {
      gas: {
        kind: "crossOffSupply",
        supply: "gasoline",
        who: "chosen",
        min: 1,
        max: 1,
        missing: { steps: [], effects: [{ do: "record", key: "out_of_gas" }] },
      },
    };
    const db = checks(steps);
    let c = run(withSupplies(db, [ROLAND, AGNES], { [ROLAND]: ["gasoline"] }), db);
    // the only one who has it uses it, not asked
    expect(supplyCount(c.log, ROLAND, "gasoline")).toBe(0);
    expect(hasEntry(c.log, "out_of_gas")).toBe(false);
    c = run(
      withSupplies(db, [ROLAND, AGNES], { [ROLAND]: ["gasoline"], [AGNES]: ["gasoline"] }),
      db,
    );
    expect(c.flow.waiting?.step).toMatchObject({ kind: "supplyChoice", among: [ROLAND, AGNES] });
    c = advance(db, c, AGNES);
    expect(supplyCount(c.log, AGNES, "gasoline")).toBe(0);
    expect(supplyCount(c.log, ROLAND, "gasoline")).toBe(1);
    c = run(withSupplies(db, [ROLAND, AGNES], {}), db);
    expect(hasEntry(c.log, "out_of_gas")).toBe(true);
  });

  it("medicine: the chosen investigators each use one and remove a Poisoned", () => {
    const steps = {
      heal: {
        kind: "crossOffSupply",
        supply: "medicine",
        who: "chosen",
        min: 0,
        max: 4,
        used: { effects: [{ do: "removeCard", code: "04102", who: "input" }] },
      },
    };
    const db = checks(steps);
    let c = withSupplies(db, [ROLAND, AGNES], { [ROLAND]: ["medicine"], [AGNES]: ["medicine"] });
    c = {
      ...c,
      investigators: c.investigators.map((i) => ({ ...i, deck: [...i.deck, "04102"] })),
    };
    c = run(c, db);
    c = advance(db, c, [ROLAND]);
    expect(c.investigators.find((i) => i.code === ROLAND)!.deck).not.toContain("04102");
    expect(c.investigators.find((i) => i.code === AGNES)!.deck).toContain("04102");
    expect(supplyCount(c.log, AGNES, "medicine")).toBe(1);
  });

  it("each: a blanket's branch per investigator; any: a branch on hasSupply", () => {
    const steps = {
      sleep: {
        kind: "checkSupply",
        supply: "blanket",
        who: "each",
        has: { steps: ["ok"] },
        missing: { effects: [{ do: "trauma", who: "input", physical: 1, mental: 0 }] },
      },
      map: {
        kind: "branch",
        condition: { kind: "hasSupply", supply: "map", inv: "any" },
        then: ["mapped"],
        else: [],
      },
      mapped: record("mapped"),
    };
    const db = checks(steps);
    const c = run(
      withSupplies(db, [ROLAND, AGNES], { [ROLAND]: ["blanket"], [AGNES]: ["map"] }, [
        "sleep",
        "map",
      ]),
      db,
    );
    expect(c.investigators.find((i) => i.code === AGNES)!.physicalTrauma).toBe(1);
    expect(c.investigators.find((i) => i.code === ROLAND)!.physicalTrauma).toBe(0);
    expect(hasEntry(c.log, "mapped")).toBe(true);
    expect(test(db, c, { kind: "hasSupply", supply: "blanket", inv: "any" })).toBe(true);
  });

  it("chosen: the group's lookout is one who has binoculars", () => {
    const steps = {
      look: {
        kind: "checkSupply",
        supply: "binoculars",
        who: "chosen",
        has: { effects: [{ do: "xp", bonus: 2, who: "input" }] },
        missing: { effects: [{ do: "trauma", who: "input", physical: 0, mental: 1 }] },
      },
    };
    const db = checks(steps);
    const c = run(withSupplies(db, [ROLAND, AGNES], { [AGNES]: ["binoculars"] }), db);
    expect(c.investigators.find((i) => i.code === AGNES)!.xp).toBe(2);
  });
});

describe("supplies in a scenario (2.4)", () => {
  /** The Gathering played with Roland's and Agnes's supplies */
  const play = () => {
    const db = checks({});
    let c = begin(db, [ROLAND, AGNES]);
    c = { ...c, log: addSupply(addSupply(c.log, ROLAND, "rope"), AGNES, "map") };
    const r = toTurn(skipMulligans(createGame(db, scenarioSetup(db, c, 1))));
    return { db, c, r };
  };

  it("a card checks a supply: yours, at your location, anyone's", () => {
    const { r } = play();
    const g = gOf(r);
    const has = (supply: "map" | "rope", who: "you" | "atYourLocation" | "any") =>
      checkCondition(g, { hasSupply: { supply, who } }, { you: ROLAND });
    expect(has("map", "you")).toBe(false);
    expect(has("map", "atYourLocation")).toBe(true);
    expect(has("rope", "you")).toBe(true);
    expect(has("map", "any")).toBe(true);
  });

  it("a rope crossed off during the scenario is gone from the log after it", () => {
    const { db, c, r: r0 } = play();
    let r = inject(r0, () => {}, {
      t: STEP.Eff,
      effect: { op: "crossOffSupply", supply: "rope", who: "any" },
      ctx: { you: AGNES },
    });
    r = inject(r, () => {}, { t: STEP.Resolution, id: "R1" });
    const after = applyScenarioEnd(db, c, r.state);
    expect(hasSupply(after.log, ROLAND, "rope")).toBe(false);
    expect(hasSupply(after.log, AGNES, "map")).toBe(true);
  });
});

describe("a campaign saved before supplies (6.1)", () => {
  it("gains an empty supplies section and records with no vengeance", () => {
    const db = checks({});
    const c = begin(db, [ROLAND]);
    const old = {
      ...c,
      version: 18,
      log: { campaign_notes: c.log.campaign_notes },
      history: [{ scenarioId: GATHERING, resolution: "R1", xp: 2, victory: 1 }],
    };
    const m = migrateCampaign(db, structuredClone(old), false);
    expect(m.version).toBe(19);
    expect(m.log.supplies.supplies).toEqual({});
    expect(m.history[0]).toEqual({ ...old.history[0], vengeance: 0 });
    // a current save is left as it is
    expect(migrateCampaign(db, structuredClone(c), false)).toEqual(c);
  });
});
