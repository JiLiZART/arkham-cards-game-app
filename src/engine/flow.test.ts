import { describe, expect, it } from "vitest";
import { CampaignDef, CampaignFlow } from "../content/schema";
import { applyScenarioEnd, startCampaign, type CampaignState } from "./campaign";
import type { FlowCondition } from "../content/schema";
import { addCards, crossOut, flatLog, hasEntry, logCount, record, setCount, setInvestigatorCount } from "./campaignLog";
import { createGame } from "./engine";
import { advance, test } from "./flow";
import { db as base, mutate } from "./testkit";

const ROLAND = "01001";
const AGNES = "01004";
const NOTZ = base.campaigns["night-of-the-zealot"];

const flowDb = (flow: object) => ({
  ...base,
  campaigns: { ...base.campaigns, t: CampaignDef.parse({ id: "t", name: "T", scenarios: NOTZ.scenarios, chaosBags: NOTZ.chaosBags, logSections: [{ id: "campaign_notes", kind: "entries", label: "Notes" }, { id: "doubt", kind: "count", label: "Doubt" }] }) },
  flows: { ...base.flows, t: CampaignFlow.parse(flow) },
});
const begin = (db: ReturnType<typeof flowDb>, who = [ROLAND]) =>
  startCampaign(db, { campaignId: "t", difficulty: "standard", seed: 7, investigators: who.map((code) => ({ code, deckId: code === ROLAND ? "roland-starter" : "agnes-starter" })) });
const story = (text: string) => ({ kind: "story", text });
const effects = (...e: object[]) => ({ kind: "effects", effects: e });
const GATHERING = "the-gathering";
const MASKS = "the-midnight-masks";
const DEVOURER = "the-devourer-below";

const flow = (over: object = {}) => ({
  setup: ["intro"],
  order: ["pro", GATHERING, "mid", MASKS, DEVOURER],
  interludes: { pro: { kind: "interlude", name: "Prologue", steps: ["pick"] }, mid: { kind: "interlude", name: "Between", steps: ["check", "up"] } },
  resolutions: {},
  steps: {
    intro: story("Their hand is at your throats"),
    pick: { kind: "chooseOne", text: "Where first?", choices: [{ id: "a", text: "A", effects: [{ do: "record", key: "wentA" }], steps: [] }, { id: "b", text: "B", effects: [{ do: "nextScenario", scenario: MASKS }, { do: "skipScenario", scenario: GATHERING }], steps: [] }] },
    check: { kind: "branch", condition: { kind: "logHas", id: "wentA" }, then: ["tale-a"], else: ["tale-b"] },
    "tale-a": story("A happened."),
    "tale-b": story("B happened."),
    up: { kind: "upgradeDecks" },
  },
  ...over,
});

const shownStories = (c: CampaignState) => c.flow.shown.filter((s): s is { story: string } => "story" in s).map((s) => s.story);
const kindOf = (c: CampaignState) => c.flow.waiting?.step.kind ?? null;

describe("advance: reading and prompts", () => {
  it("starts by running the setup to a Continue, then the first interlude's prompt", () => {
    const c = begin(flowDb(flow()));
    expect(kindOf(c)).toBe("continue");
    expect(shownStories(c)).toEqual(["intro"]);
    const d = flowDb(flow());
    const c2 = advance(d, c, "continue");
    expect(kindOf(c2)).toBe("chooseOne");
    expect(c2.flow.item).toBe("pro");
    expect(c2.flow.shown).toEqual([]);
  });

  it("applies a choice's effects and goes on: A records an entry, then the scenario comes", () => {
    const d = flowDb(flow());
    let c = advance(d, begin(d), "continue");
    c = advance(d, c, "a");
    expect(hasEntry(c.log, "wentA")).toBe(true);
    expect(kindOf(c)).toBe("play");
    expect(c.flow.play).toBe(GATHERING);
  });

  it("a choice can name the next scenario and skip another", () => {
    const d = flowDb(flow());
    let c = advance(d, begin(d), "continue");
    c = advance(d, c, "b");
    expect(c.flow.play).toBe(MASKS);
    c = advance(d, c, "continue");
    expect(c.flow.playing).toBe(true);
  });

  it("refuses an answer that isn't on offer, and an answer when nothing is asked", () => {
    const d = flowDb(flow());
    const c = advance(d, begin(d), "continue");
    expect(() => advance(d, c, "z")).toThrow(/not a choice/);
    expect(() => advance(d, c)).toThrow(/waiting for an answer/);
    const playing = advance(d, advance(d, c, "a"), "continue");
    expect(() => advance(d, playing, "continue")).toThrow(/not waiting/);
  });

  it("does not change the state it was given", () => {
    const d = flowDb(flow());
    const c = begin(d);
    const before = JSON.stringify(c);
    advance(d, c, "continue");
    expect(JSON.stringify(c)).toBe(before);
  });

  it("is deterministic and survives being saved and loaded: the same answers give the same state", () => {
    const d = flowDb(flow());
    const run = (c: CampaignState) => advance(d, advance(d, c, "continue"), "a");
    const c = begin(d);
    expect(JSON.stringify(run(JSON.parse(JSON.stringify(c))))).toBe(JSON.stringify(run(c)));
  });
});

describe("advance: the scenario's end and the order", () => {
  const ended = (c: CampaignState, d: ReturnType<typeof flowDb>, scenario: string, resolution: string) => {
    const r = mutate(createGame(d, { campaignId: "t", scenarioId: scenario, difficulty: "standard", seed: 1, investigators: c.investigators.map((i) => ({ code: i.code, deck: i.deck })), campaignLog: flatLog(c.log), chaosBag: c.chaosBag }), (g) => {
      g.s.phase = "ended";
      g.s.resolution = resolution;
      g.s.pending = null;
    });
    return applyScenarioEnd(d, c, r.state);
  };

  it("runs the resolution's steps from the flow, then the interlude that follows, branching on the log", () => {
    const d = flowDb(
      flow({
        resolutions: { [GATHERING]: { R1: ["won"] } },
        steps: { ...flow().steps, won: effects({ do: "record", key: "wentA" }, { do: "count", id: "doubt", section: "doubt", op: "add", value: 2 }, { do: "xp", bonus: 3, who: "each" }) },
      }),
    );
    let c = advance(d, advance(d, begin(d), "continue"), "a");
    c = advance(d, c, "continue");
    c = ended(c, d, GATHERING, "R1");
    expect(logCount(c.log, "doubt", "doubt")).toBe(2);
    expect(c.investigators[0].xp).toBe(3);
    expect(c.history.at(-1)).toMatchObject({ scenarioId: GATHERING, resolution: "R1", xp: 3 });
    // the interlude between reads "A happened" (the log says wentA), with the deck upgrade offered under it
    expect(kindOf(c)).toBe("upgradeDecks");
    expect(shownStories(c)).toEqual(["tale-a"]);
    c = advance(d, c, "continue");
    expect(kindOf(c)).toBe("play");
    expect(c.flow.play).toBe(MASKS);
  });

  it("falls back to the scenario file's own effects for a resolution the flow doesn't list", () => {
    const d = flowDb(flow());
    let c = advance(d, advance(d, begin(d), "continue"), "a");
    c = advance(d, c, "continue");
    c = ended(c, d, GATHERING, "R1");
    expect(hasEntry(c.log, "houseBurned")).toBe(true);
  });

  it("skipping a scenario leaves it out of the order, and the order ends the campaign with a win", () => {
    const d = flowDb(flow({ order: [GATHERING, MASKS], steps: { ...flow().steps, intro: effects({ do: "skipScenario", scenario: GATHERING }) } }));
    let c = begin(d);
    expect(c.flow.play).toBe(MASKS);
    c = advance(d, c, "continue");
    c = ended(c, d, MASKS, "R1");
    expect(c.result).toBe("win");
    expect(c.flow.waiting).toBeNull();
  });

  it("an end step sets the result at once, whatever is left in the order", () => {
    const d = flowDb(flow({ setup: ["stop"], steps: { ...flow().steps, stop: { kind: "end", result: "lose" } } }));
    expect(begin(d).result).toBe("lose");
  });

  it("a replayed scenario is played again before the order goes on", () => {
    const d = flowDb(flow({ order: [GATHERING, MASKS], resolutions: { [GATHERING]: { R1: ["again"] } }, setup: [], interludes: {}, steps: { again: effects({ do: "replayScenario", scenario: GATHERING }) } }));
    let c = begin(d);
    c = advance(d, c, "continue");
    c = ended(c, d, GATHERING, "R1");
    expect(c.flow.play).toBe(GATHERING);
  });
});

describe("advance: the other prompts", () => {
  const first = (steps: Record<string, object>, ids: string[], who = [ROLAND]) => {
    const d = flowDb(flow({ setup: ids, steps: { ...flow().steps, ...steps } }));
    return { d, c: begin(d, who) };
  };

  it("a counter takes a number within its limits and hands it to the effects", () => {
    const { d, c } = first({ n: { kind: "counter", text: "How many?", min: 0, max: 3, effects: [{ do: "count", id: "doubt", section: "doubt", op: "add", value: "input" }], steps: [] } }, ["n"]);
    expect(kindOf(c)).toBe("counter");
    expect(() => advance(d, c, 4)).toThrow(/out of range/);
    expect(logCount(advance(d, c, 2).log, "doubt", "doubt")).toBe(2);
  });

  it("an investigator choice names who the effects are for", () => {
    const { d, c } = first({ who: { kind: "investigatorChoice", effects: [{ do: "trauma", who: "input", physical: 1, mental: 0 }], steps: [] } }, ["who"], [ROLAND, AGNES]);
    const next = advance(d, c, AGNES);
    expect(next.investigators.map((i) => i.physicalTrauma)).toEqual([0, 1]);
    expect(() => advance(d, c, "99999")).toThrow(/can't be chosen/);
  });

  it("a card choice applies the effects once for each card taken", () => {
    const { d, c } = first({ cc: { kind: "cardChoice", codes: ["01020", "01016"], min: 1, max: 2, effects: [{ do: "removeCard", code: "$input" }], steps: [] } }, ["cc"]);
    expect(c.investigators[0].deck).toContain("01016");
    const next = advance(d, c, ["01016"]);
    expect(next.investigators[0].deck).not.toContain("01016");
    expect(() => advance(d, c, ["01001"])).toThrow(/not on offer/);
    expect(() => advance(d, c, [])).toThrow(/choose from 1 to 2/);
  });

  it("a checklist applies each ticked entry, within its limits", () => {
    const { d, c } = first({ cl: { kind: "checklist", min: 0, max: 2, choices: [{ id: "x", text: "X", effects: [{ do: "record", key: "x" }], steps: [] }, { id: "y", text: "Y", effects: [{ do: "record", key: "y" }], steps: [] }] } }, ["cl"]);
    const next = advance(d, c, ["x", "y"]);
    expect([hasEntry(next.log, "x"), hasEntry(next.log, "y")]).toEqual([true, true]);
    expect(() => advance(d, c, ["x", "y", "z"])).toThrow();
  });

  it("a side scenario costs each investigator its experience and is played next; declining costs nothing", () => {
    const { d, c } = first({ side: { kind: "sideScenario", scenarios: [{ scenario: DEVOURER, cost: 3 }] } }, ["side"]);
    expect(() => advance(d, c, DEVOURER)).toThrow(/needs 3 experience/);
    const rich = { ...c, investigators: c.investigators.map((i) => ({ ...i, xp: 5 })) };
    const taken = advance(d, rich, DEVOURER);
    expect(taken.investigators[0].xp).toBe(2);
    expect(taken.flow.play).toBe(DEVOURER);
    const declined = advance(d, rich, null);
    expect(declined.investigators[0].xp).toBe(5);
    expect(declined.flow.play).not.toBe(DEVOURER);
  });

  it("an unsupported prompt shows the guide's text and applies its default on Continue", () => {
    const { d, c } = first({ u: { kind: "unsupported", name: "partner_choice", text: "Choose a partner", effects: [{ do: "record", key: "defaulted" }], steps: [] } }, ["u"]);
    expect(kindOf(c)).toBe("unsupported");
    expect(hasEntry(advance(d, c, "continue").log, "defaulted")).toBe(true);
  });

  it("an effect for one investigator the players choose asks which, when there are several, and the effects after it wait", () => {
    const { d, c } = first({ fx: effects({ do: "earnCard", code: "02040", who: "choice" }, { do: "record", key: "after" }) }, ["fx"], [ROLAND, AGNES]);
    expect(kindOf(c)).toBe("investigator");
    expect(hasEntry(c.log, "after")).toBe(false);
    const next = advance(d, c, AGNES);
    expect(next.investigators[1].deck).toContain("02040");
    expect(next.investigators[0].deck).not.toContain("02040");
    expect(hasEntry(next.log, "after")).toBe(true);
  });

  it("the same effect with one investigator just applies", () => {
    const { c } = first({ fx: effects({ do: "earnCard", code: "02040", who: "choice" }) }, ["fx"]);
    expect(c.investigators[0].deck).toContain("02040");
  });

  it("trauma that reaches health kills; a lead who is out hands the lead on", () => {
    const { c } = first({ fx: effects({ do: "trauma", who: "lead", physical: 99, mental: 0 }) }, ["fx"], [ROLAND, AGNES]);
    expect(c.investigators.map((i) => i.status)).toEqual(["killed", "active"]);
    expect(c.lead).toBe(AGNES);
  });

  it("every investigator out ends the campaign as lost", () => {
    const { c } = first({ fx: effects({ do: "trauma", who: "each", physical: 99, mental: 0 }) }, ["fx"]);
    expect(c.result).toBe("lose");
  });
});

describe("test: conditions", () => {
  const d = flowDb(flow({ setup: [] }));
  const c0 = begin(d, [ROLAND, AGNES]);
  let c = { ...c0, log: record(setCount(setInvestigatorCount(addCards(crossOut(record(c0.log, "a"), "a"), "list", ["01016"]), "xp", AGNES, "add", 2), "doubt", "add", 2, "doubt"), "b") } as CampaignState;
  c = { ...c, history: [{ scenarioId: GATHERING, resolution: "R2", xp: 0, victory: 0 }] };
  const t = (cond: FlowCondition, input = {}) => test(d, c, cond, input);

  it("reads entries, crossed-out entries, counts, card lists and per-investigator counts", () => {
    expect(t({ kind: "logHas", id: "b" })).toBe(true);
    expect(t({ kind: "logHas", id: "a" })).toBe(false);
    expect(t({ kind: "logCrossedOut", id: "a" })).toBe(true);
    expect(t({ kind: "logCount", id: "doubt", section: "doubt", min: 2, max: 2 })).toBe(true);
    expect(t({ kind: "logCount", id: "doubt", section: "doubt", min: 3 })).toBe(false);
    expect(t({ kind: "logCards", id: "list", card: "01016" })).toBe(true);
    expect(t({ kind: "logCards", id: "list", card: "01020" })).toBe(false);
    expect(t({ kind: "investigatorCount", id: "xp", inv: "any", min: 2 })).toBe(true);
    expect(t({ kind: "investigatorCount", id: "xp", inv: "lead", min: 1 })).toBe(false);
    expect(t({ kind: "investigatorCount", id: "xp", inv: "input", min: 2 }, { inv: AGNES })).toBe(true);
  });

  it("reads the campaign: what was played and how it ended, the difficulty, the players, the decks, the trauma", () => {
    expect(t({ kind: "scenarioCompleted", scenario: GATHERING })).toBe(true);
    expect(t({ kind: "scenarioCompleted", scenario: GATHERING, resolution: "R1" })).toBe(false);
    expect(t({ kind: "difficulty", is: ["standard", "hard"] })).toBe(true);
    expect(t({ kind: "difficulty", is: ["easy"] })).toBe(false);
    expect(t({ kind: "playerCount", min: 2, max: 2 })).toBe(true);
    expect(t({ kind: "playerCount", max: 1 })).toBe(false);
    expect(t({ kind: "hasCard", card: "01016", inv: "lead" })).toBe(true);
    expect(t({ kind: "hasCard", card: "01016", inv: "input" }, { inv: AGNES })).toBe(false);
    expect(t({ kind: "trauma", inv: "any", mental: 1 })).toBe(false);
  });

  it("combines tests, and takes the guide's answer for one it can't make", () => {
    expect(t({ kind: "not", condition: { kind: "logHas", id: "a" } })).toBe(true);
    expect(t({ kind: "all", conditions: [{ kind: "logHas", id: "b" }, { kind: "playerCount", min: 2 }] })).toBe(true);
    expect(t({ kind: "any", conditions: [{ kind: "logHas", id: "a" }, { kind: "logHas", id: "zzz" }] })).toBe(false);
    expect(t({ kind: "unsupported", name: "partner_status", take: true })).toBe(true);
    expect(t({ kind: "unsupported", name: "partner_status", take: false })).toBe(false);
  });
});
