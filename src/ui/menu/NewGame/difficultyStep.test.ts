import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { db } from "../../state/context";
import { initialWizard } from "../wizard";
import { DifficultyStep } from "./NewGame";

const NOTZ = "night-of-the-zealot";
const saved = db.campaigns[NOTZ].options;
afterEach(() => {
  db.campaigns[NOTZ].options = saved;
});
const render = (options: string[] = []) =>
  renderToStaticMarkup(
    createElement(DifficultyStep, {
      s: { ...initialWizard(db), campaignId: NOTZ, options },
      set: () => {},
    }),
  );

describe("the difficulty step's campaign options", () => {
  it("a campaign that declares no option shows no toggle", () => {
    db.campaigns[NOTZ].options = [];
    expect(render()).not.toContain('data-testid="campaign-options"');
  });

  it("shows one toggle per declared option, checked when it is on", () => {
    db.campaigns[NOTZ].options = [
      { id: "a", labelKey: "wizard.options", replaceSets: {}, addSets: [] },
      { id: "b", labelKey: "wizard.options", replaceSets: {}, addSets: [] },
    ];
    const html = render(["b"]);
    expect(html).toContain('data-testid="campaign-options"');
    expect(html.match(/type="checkbox"/g)).toHaveLength(2);
    expect(html.match(/checked=""/g)).toHaveLength(1);
  });
});
