import { afterEach, describe, expect, it } from "vitest";
import { dispatch } from "../../index";
import { game, hand, inject, inPlay, pendingStep } from "../../kits/driver";
import { mutate } from "../../kits/testkit";
import { cardOf, cardsOf, invOf } from "../../context";
import { createCard, moveCard } from "../../movement";
import { db } from "../../kits/testkit";
import { CHOICE, ZONE } from "../../world/constants";
import { STEP } from "../../steps/step";
import { invStateIn } from "../../world/store";
import { findByCode } from "../../queries";
import type { CardScript, HookRun, ScriptRun } from "../../world/types";
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

describe("script hooks", () => {
  const saved = new Map<string, CardScript | undefined>();
  const override = (code: string, script: CardScript) => {
    if (!saved.has(code)) saved.set(code, db.scripts[code]);
    db.scripts[code] = script;
  };
  afterEach(() => {
    for (const [code, s] of saved) {
      if (s) db.scripts[code] = s;
      else delete db.scripts[code];
    }
    saved.clear();
  });

  it("spawnRedirect's returned location is where the Ghoul Priest spawns in The Midnight Masks", () => {
    let priest = "";
    let r = mutate(game({ scenario: "the-midnight-masks", investigators: [ROLAND] }), (g) => {
      priest = createCard(g, "01116", ZONE.Limbo);
    });
    r = inject(r, () => {}, { t: STEP.Spawn, enemy: priest, inv: null });
    const at = cardOf(r.state, priest).location!;
    expect(cardOf(r.state, at).code).toBe("01124");
  });

  it("healHorror hooks each lower the heal, in the order the cards are found", () => {
    const order: string[] = [];
    const lower = (name: string) => ({
      hooks: {
        healHorror: (_g: unknown, _run: unknown, _t: unknown, n: number) => (
          order.push(name),
          n - 1
        ),
      },
    });
    override("01020", lower("machete"));
    override("01016", lower("45"));
    const r = inject(
      game({
        investigators: [ROLAND],
        prep: (g) => {
          inPlay(g, ROLAND, "01020");
          inPlay(g, ROLAND, "01016");
          invStateIn(g.s, ROLAND).horror = 3;
        },
      }),
      () => {},
      { t: STEP.Effects, effects: [{ op: "heal", horror: 3 }], ctx: { you: ROLAND } },
    );
    expect(invOf(r.state, ROLAND).horror).toBe(2);
    const found = cardsOf(r.state)
      .filter((c) => c.zone === "play" && (c.code === "01020" || c.code === "01016"))
      .map((c) => (c.code === "01020" ? "machete" : "45"));
    expect(order).toEqual(found);
  });

  it("gameEnd fires for an eliminated investigator's weaknesses only, and at the resolution for cards in play, threat and hand", () => {
    const fired: string[] = [];
    const record = {
      hooks: { gameEnd: (_g: unknown, run: HookRun) => void fired.push(run.source) },
    };
    override("01007", record); // Cover Up, a weakness
    override("01020", record); // Machete, not one
    let weakness = "";
    let asset = "";
    let r = game({
      investigators: [ROLAND, DAISY],
      prep: (g) => {
        weakness = hand(g, DAISY, "01007");
        asset = hand(g, DAISY, "01020");
      },
    });
    r = inject(r, () => {}, { t: STEP.Defeated, inv: DAISY, by: "damage" });
    expect(fired).toEqual([weakness]);

    fired.length = 0;
    let inPlayId = "";
    let threat = "";
    let held = "";
    let gone = "";
    r = inject(
      game({
        investigators: [ROLAND],
        prep: (g) => {
          inPlayId = inPlay(g, ROLAND, "01020");
          threat = hand(g, ROLAND, "01007");
          moveCard(g, threat, ZONE.Threat);
          held = hand(g, ROLAND, "01020");
          gone = hand(g, ROLAND, "01020");
          moveCard(g, gone, ZONE.Discard);
        },
      }),
      () => {},
      { t: STEP.Resolution, id: "R1" },
    );
    expect(new Set(fired)).toEqual(new Set([inPlayId, threat, held]));
    expect(fired).not.toContain(gone);
    expect(asset).not.toBe("");
  });
});
