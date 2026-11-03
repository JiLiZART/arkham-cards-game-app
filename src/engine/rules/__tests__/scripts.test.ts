import { afterEach, describe, expect, it } from "vitest";
import { dispatch } from "../../index";
import { game, inject, pendingStep } from "../../kits/driver";
import { db } from "../../kits/testkit";
import { CHOICE, ZONE } from "../../world/constants";
import { STEP } from "../../steps/step";
import { invStateIn } from "../../world/store";
import { findByCode } from "../../queries";
import type { CardScript, ScriptRun } from "../../world/types";
import { runScript } from "../scripts";

const ROLAND = "01001";
const DAISY = "01002";
const CODE = "zz-test-script";
const prompt = { text: "Choose" };

let seen: { you?: string; after?: unknown; calls: number } = { calls: 0 };
const withScript = (fns: CardScript["fns"]) => {
  db.scripts[CODE] = { fns };
};
afterEach(() => {
  delete db.scripts[CODE];
  seen = { calls: 0 };
});
const scriptStep = (fn: string, ctx = {}) => ({ t: STEP.Script, code: CODE, fn, ctx });
const locations = (r: ReturnType<typeof game>) =>
  ["01111"].map((c) => findByCode({ s: r.state, db, events: [] }, c, [ZONE.Location])!.id);

describe("the script run", () => {
  it("resolves for the lead investigator when the context names none", () => {
    withScript({ who: (_g, run: ScriptRun) => void (seen.you = run.you) });
    inject(game({ investigators: [ROLAND, DAISY] }), () => {}, scriptStep("who"));
    expect(seen.you).toBe(ROLAND);
  });

  it("reading a missing source throws, naming the script and function", () => {
    withScript({ src: (_g, run: ScriptRun) => void run.source });
    expect(() => inject(game({ investigators: [ROLAND] }), () => {}, scriptStep("src"))).toThrow(
      `${CODE}.src`,
    );
  });

  it("a script for an eliminated investigator resolves nothing", () => {
    withScript({ count: () => void seen.calls++ });
    inject(
      game({ investigators: [ROLAND, DAISY] }),
      (g) => {
        invStateIn(g.s, DAISY).status = "defeated";
      },
      scriptStep("count", { you: DAISY }),
    );
    expect(seen.calls).toBe(0);
  });

  it("a choice between two waits for the player, and nothing after it runs", () => {
    withScript({
      pick: (_g, run: ScriptRun) => {
        seen.after = run.choose(
          [
            { id: "a", label: "A", value: "a" },
            { id: "b", label: "B", value: "b" },
          ],
          prompt,
        );
      },
    });
    const step = scriptStep("pick", { you: ROLAND });
    const r = inject(game({ investigators: [ROLAND] }), () => {}, step);
    expect(r.state.pending?.kind).toBe(CHOICE.Target);
    expect(r.state.pending?.options.map((o) => o.id)).toEqual(["a", "b"]);
    expect(seen.after).toBeUndefined();
    expect(pendingStep(r)).toMatchObject(step);
  });

  it("the chosen value reaches the code after the choice", () => {
    withScript({
      pick: (_g, run: ScriptRun) => {
        seen.after = run.choose(
          [
            { id: "a", label: "A", value: "a" },
            { id: "b", label: "B", value: "b" },
          ],
          prompt,
        );
      },
    });
    const r = inject(
      game({ investigators: [ROLAND] }),
      () => {},
      scriptStep("pick", { you: ROLAND }),
    );
    const next = dispatch(db, r.state, { type: "choose", inv: ROLAND, option: "b" });
    expect(next.error).toBeUndefined();
    expect(seen.after).toBe("b");
  });

  it("a single option is taken without asking", () => {
    withScript({
      one: (g, run: ScriptRun) =>
        void (seen.after = run.chooseCard(locations({ state: g.s, events: [] }), prompt)),
    });
    const r = inject(
      game({ investigators: [ROLAND] }),
      () => {},
      scriptStep("one", { you: ROLAND }),
    );
    expect(seen.after).toBeDefined();
    expect(r.state.pending?.kind).toBe("turn");
  });

  it("a single option still asks when told not to pick it alone", () => {
    withScript({
      one: (g, run: ScriptRun) =>
        void (seen.after = run.chooseCard(locations({ state: g.s, events: [] }), prompt, {
          auto: false,
        })),
    });
    const r = inject(
      game({ investigators: [ROLAND] }),
      () => {},
      scriptStep("one", { you: ROLAND }),
    );
    expect(seen.after).toBeUndefined();
    expect(r.state.pending?.options).toHaveLength(1);
  });

  it("chooseInvestigator labels the options with the investigators' names", () => {
    withScript({
      inv: (_g, run: ScriptRun) => void run.chooseInvestigator([ROLAND, DAISY], prompt),
    });
    const r = inject(
      game({ investigators: [ROLAND, DAISY] }),
      () => {},
      scriptStep("inv", { you: ROLAND }),
    );
    expect(r.state.pending?.options.map((o) => o.label)).toEqual(["Roland Banks", "Daisy Walker"]);
  });

  it("a script called outside a Script step may not wait on a choice", () => {
    withScript({
      pick: (_g, run: ScriptRun) =>
        void run.choose(
          [
            { id: "a", label: "A", value: "a" },
            { id: "b", label: "B", value: "b" },
          ],
          prompt,
        ),
    });
    const r = game({ investigators: [ROLAND] });
    const g = { s: structuredClone(r.state), db, events: [] };
    expect(() =>
      runScript(g, { t: STEP.Script, code: CODE, fn: "pick", ctx: {} }, { direct: true }),
    ).toThrow(/outside a Script step/);
  });
});
