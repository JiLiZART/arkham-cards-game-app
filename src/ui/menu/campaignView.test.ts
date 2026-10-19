import { describe, expect, it } from "vitest";
import { CampaignDef, CampaignFlow, I18nCampaigns } from "../../content/schema";
import { startCampaign } from "../../engine/campaign";
import { addCards, crossOut, record, setCount, setInvestigatorCount } from "../../engine/campaignLog";
import { advance } from "../../engine/flow";
import { db as base } from "../../engine/testkit";
import { logView, readItems, visibleChoices } from "./campaignView";

const flow = CampaignFlow.parse({
  setup: ["intro"],
  order: ["the-gathering"],
  interludes: {},
  resolutions: {},
  steps: {
    intro: { kind: "story", title: "Prologue", text: "<b>Their</b> hand is at your throats." },
    pick: { kind: "chooseOne", choices: [{ id: "a", text: "A", effects: [], steps: [] }, { id: "b", text: "B", effects: [], steps: [], when: { kind: "logHas", id: "never" } }] },
  },
});
const def = CampaignDef.parse({
  id: "t",
  name: "T",
  scenarios: ["the-gathering"],
  chaosBags: base.campaigns["night-of-the-zealot"].chaosBags,
  logSections: [{ id: "campaign_notes", kind: "entries", label: "Campaign Notes" }, { id: "doubt", kind: "count", label: "Doubt" }, { id: "sacrificed", kind: "entries", label: "Sacrificed to Yog-Sothoth" }],
});
const labels = { rescued: "The investigators rescued Dr. Armitage." };
const enText = I18nCampaigns.parse({ campaigns: { t: { logLabels: labels } } });
const ruText = I18nCampaigns.parse({ campaigns: { t: { logLabels: labels, steps: { intro: { text: "Рука у вашего горла." } } } } });
const db = { ...base, campaigns: { ...base.campaigns, t: def }, flows: { ...base.flows, t: flow }, i18n: { ...base.i18n, ru: { ...(base.i18n.ru ?? { cards: {}, ui: {} }), campaigns: ruText }, en: { ...base.i18n.en, campaigns: { ...base.i18n.en.campaigns, campaigns: { ...base.i18n.en.campaigns.campaigns, t: enText.campaigns.t } } } } };
const c0 = startCampaign(db, { campaignId: "t", difficulty: "standard", seed: 1, investigators: [{ code: "01001", deckId: "roland-starter" }] });

describe("readItems", () => {
  it("is the stories read since the last prompt, in the locale, then the log entries just recorded as their labels", () => {
    expect(readItems(db, c0, "en")).toEqual([{ kind: "story", title: "Prologue", text: "<b>Their</b> hand is at your throats." }]);
    expect(readItems(db, c0, "ru")[0]).toMatchObject({ kind: "story", title: "Prologue", text: "Рука у вашего горла." });
    const c = { ...c0, flow: { ...c0.flow, shown: [...c0.flow.shown, { recorded: { id: "rescued", section: "campaign_notes" } }] } };
    expect(readItems(db, c, "en").at(-1)).toEqual({ kind: "recorded", label: "The investigators rescued Dr. Armitage." });
  });

  it("writes a log entry the guide gave as a fragment as a sentence", () => {
    const withFragment = { ...db, i18n: { ...db.i18n, en: { ...db.i18n.en, campaigns: { ...db.i18n.en.campaigns, campaigns: { ...db.i18n.en.campaigns.campaigns, t: { ...enText.campaigns.t, logLabels: { frag: "the investigators failed to save the students." } } } } } } };
    const c = { ...c0, flow: { ...c0.flow, shown: [{ recorded: { id: "frag", section: "campaign_notes" } }] } };
    expect(readItems(withFragment, c, "en")).toEqual([{ kind: "recorded", label: "The investigators failed to save the students." }]);
  });

  it("is empty when nothing has been read", () => {
    expect(readItems(db, advance(db, c0, "continue"), "en")).toEqual([]);
  });
});

describe("visibleChoices", () => {
  it("leaves out a choice whose own test fails", () => {
    const st = flow.steps.pick;
    if (st.kind !== "chooseOne") throw new Error("choose");
    expect(visibleChoices(db, c0, st.choices).map((x) => x.id)).toEqual(["a"]);
    const withLog = { ...c0, log: record(c0.log, "never") };
    expect(visibleChoices(db, withLog, st.choices).map((x) => x.id)).toEqual(["a", "b"]);
  });
});

describe("logView", () => {
  it("lists every section the campaign declares, in order, with its entries, counts and card lists, crossed-out entries marked", () => {
    let log = record(c0.log, "rescued");
    log = crossOut(record(log, "gone"), "gone");
    log = setCount(log, "doubt", "add", 2, "doubt");
    log = addCards(log, "sacrificed", ["02040"], false, "sacrificed");
    log = setInvestigatorCount(log, "xp", "01001", "add", 3, "campaign_notes");
    const v = logView(db, { ...c0, log }, "en");
    expect(v.map((s) => s.id)).toEqual(["campaign_notes", "doubt", "sacrificed"]);
    expect(v[0].entries).toEqual([{ id: "rescued", label: "The investigators rescued Dr. Armitage.", crossedOut: false }, { id: "gone", label: "Gone", crossedOut: true }]);
    expect(v[0].investigators[0]).toMatchObject({ id: "xp", byInvestigator: [{ code: "01001", n: 3 }] });
    expect(v[1]).toMatchObject({ label: "Doubt", counts: [{ id: "doubt", n: 2 }] });
    expect(v[2].cards).toEqual([{ id: "sacrificed", codes: ["02040"] }]);
  });

  it("leaves out the hidden section and a section with nothing in it", () => {
    const log = record(record(c0.log, "secret", "hidden"), "x");
    const v = logView(db, { ...c0, log }, "en");
    expect(v.map((s) => s.id)).toEqual(["campaign_notes"]);
  });

  it("shows a section the log has that the campaign didn't declare, under its id", () => {
    const v = logView(db, { ...c0, log: record(c0.log, "z", "surprise") }, "en");
    expect(v.map((s) => s.id)).toEqual(["surprise"]);
  });
});
