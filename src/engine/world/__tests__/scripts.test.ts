import { afterEach, describe, expect, it } from "vitest";
import { db } from "../../kits/testkit";
import type { CardScript } from "../types";
import {
  conditionFor,
  hasScript,
  SCRIPT_MEMBERS,
  scriptFnFor,
  scriptFnIn,
  scriptOf,
} from "../scripts";

const CARD = "zz-card";
const SCEN = "zz-scenario";
const own = () => {};
const scen = () => {};
const yes = () => true;
const no = () => false;

afterEach(() => {
  delete db.scripts[CARD];
  delete db.scripts[SCEN];
});
const load = (card: CardScript, scenario: CardScript) => {
  db.scripts[CARD] = card;
  db.scripts[SCEN] = scenario;
};

describe("the script registry", () => {
  it("finds a card's script, and says when there is none", () => {
    load({ fns: { own } }, {});
    expect(scriptOf(db, CARD)?.fns?.own).toBe(own);
    expect(hasScript(db, CARD)).toBe(true);
    expect(scriptOf(db, "zz-nothing")).toBeUndefined();
    expect(hasScript(db, "zz-nothing")).toBe(false);
  });

  it("a card's own function wins over the scenario's", () => {
    load({ fns: { go: own } }, { fns: { go: scen } });
    expect(scriptFnFor(db, SCEN, CARD, "go")).toEqual({ code: CARD, fn: own });
  });

  it("a function only the scenario has is found under the scenario's code", () => {
    load({}, { fns: { go: scen } });
    expect(scriptFnFor(db, SCEN, CARD, "go")).toEqual({ code: SCEN, fn: scen });
  });

  it("neither having it gives undefined", () => {
    load({}, {});
    expect(scriptFnFor(db, SCEN, CARD, "go")).toBeUndefined();
  });

  it("conditions follow the same rule", () => {
    load({ conditions: { c: yes } }, { conditions: { c: no, only: no } });
    expect(conditionFor(db, SCEN, CARD, "c")).toBe(yes);
    expect(conditionFor(db, SCEN, CARD, "only")).toBe(no);
    expect(conditionFor(db, SCEN, undefined, "only")).toBe(no);
    expect(conditionFor(db, SCEN, CARD, "none")).toBeUndefined();
  });

  it("the loader's check finds a function in the card or any of the scenarios", () => {
    load({}, { fns: { go: scen } });
    expect(scriptFnIn(db, CARD, "go", ["zz-other", SCEN])).toBe(true);
    expect(scriptFnIn(db, CARD, "go", ["zz-other"])).toBe(false);
  });

  it("a hook name the engine doesn't fire fails the typecheck", () => {
    const script: CardScript = {
      // @ts-expect-error: the hook is checkObjectives
      hooks: { checkObjective() {} },
    };
    expect(script).toBeDefined();
  });

  it("lists every member a script may have", () => {
    expect([...SCRIPT_MEMBERS].sort()).toEqual(
      [
        "abilities",
        "blanks",
        "cancelsSearch",
        "conditions",
        "difficulty",
        "extraActionCost",
        "extraPlayable",
        "fns",
        "hooks",
        "icons",
        "ignores",
        "modifiers",
        "wouldPlaceDoom",
      ].sort(),
    );
  });
});
