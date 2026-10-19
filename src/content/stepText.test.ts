import { describe, expect, it } from "vitest";
import { db } from "../engine/testkit";
import { interludeName, stepText } from "./i18n";
import { CampaignFlow, I18nCampaigns } from "./schema";

const flow = CampaignFlow.parse({
  setup: [],
  order: ["armitages-fate"],
  interludes: { "armitages-fate": { kind: "interlude", name: "Armitage's Fate", steps: ["s", "pick"] } },
  resolutions: {},
  steps: {
    s: { kind: "story", title: "Fate", text: "You are rattled." },
    pick: { kind: "chooseOne", text: "Who?", choices: [{ id: "a", text: "Alone", effects: [], steps: [] }] },
  },
});
const withText = (locale: string, steps: object, interludeNames: object = {}) => {
  const campaigns = I18nCampaigns.parse({ campaigns: { dwl: { steps, interludeNames } } });
  return { ...db, flows: { dwl: flow }, i18n: { ...db.i18n, [locale]: { ...(db.i18n[locale] ?? { cards: {}, ui: {} }), campaigns } } };
};

describe("stepText", () => {
  it("is the flow's own English text without a translation", () => {
    expect(stepText({ ...db, flows: { dwl: flow } }, "dwl", "s", "ru")).toEqual({ title: "Fate", text: "You are rattled." });
  });

  it("takes each field from the locale where it has one, the flow's for the rest", () => {
    const d = withText("ru", { s: { text: "Вы потрясены." } });
    expect(stepText(d, "dwl", "s", "ru")).toEqual({ title: "Fate", text: "Вы потрясены." });
  });

  it("translates a choice's button by its id", () => {
    const d = withText("ru", { pick: { choices: { a: "Один" } } });
    expect(stepText(d, "dwl", "pick", "ru").choices).toEqual({ a: "Один" });
    expect(stepText({ ...db, flows: { dwl: flow } }, "dwl", "pick", "ru").choices).toEqual({ a: "Alone" });
  });

  it("is empty for a step that has no words or doesn't exist", () => {
    expect(stepText({ ...db, flows: { dwl: flow } }, "dwl", "nope", "ru")).toEqual({});
  });
});

describe("interludeName", () => {
  it("is the translated name, else the flow's", () => {
    expect(interludeName(withText("ru", {}, { "armitages-fate": "Судьба Армитиджа" }), "dwl", "armitages-fate", "ru")).toBe("Судьба Армитиджа");
    expect(interludeName(withText("ru", {}), "dwl", "armitages-fate", "ru")).toBe("Armitage's Fate");
  });
});
