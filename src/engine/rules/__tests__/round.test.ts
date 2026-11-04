import type { ChaosToken } from "../../../content/schema";
import { describe, expect, it } from "vitest";
import { card, def, inv } from "../../context";
import { dispatch, replay } from "../../index";
import {
  db,
  gOf,
  giveCard,
  mutate,
  pick,
  putEnemy,
  setup,
  skipMulligans,
  start,
} from "../../kits/testkit";
import type { Action } from "../../world/types";
import { allCardRecsIn, invStateIn } from "../../world/store";

const ROLAND = "01001";
const DAISY = "01002";
function gathering(invs = [ROLAND], bag: ChaosToken[] = ["0"], seed = 1) {
  const r = start("the-gathering", invs, seed, { chaosBag: bag });
  return skipMulligans(r);
}

describe("round structure", () => {
  it("first round skips the mythos phase", () => {
    const r = gathering();
    expect(r.state.round).toBe(1);
    expect(r.state.phase).toBe("investigation");
    expect(card(gOf(r), r.state.agendas.a!).doom).toBe(0);
    expect(r.state.log.some((e) => e.type === "phase" && /Mythos/.test(e.text))).toBe(false);
  });

  it("upkeep: discard down to 8 cards", () => {
    let r = gathering();
    r = mutate(r, (game) => {
      for (const code of ["01088", "01088", "01089", "01089", "01092"])
        giveCard(game, ROLAND, code);
      while (inv(game, ROLAND).hand.length < 10) giveCard(game, ROLAND, "01086");
      invStateIn(game.s, ROLAND).hand.length = 10;
    });
    // end turn → enemy phase → upkeep draws 1 (11 cards) → discard 3
    r = pick(r, "End turn");
    let discards = 0;
    while (r.state.pending && /discard down to 8/.test(r.state.pending.prompt)) {
      r = pick(r, /./);
      discards++;
    }
    expect(discards).toBe(3);
    expect(invStateIn(r.state, ROLAND).hand.length).toBe(8);
  });
});

describe("step events", () => {
  const steps = (log: { type: string; inv?: string | null; data?: Record<string, unknown> }[]) =>
    log
      .filter((e) => e.type === "step")
      .map((e) => (e.inv ? `${e.data!.step}:${e.inv}` : e.data!.step));

  it("enemy phase: hunters, then attacks, each once and before their events", () => {
    let r = skipMulligans(start("the-midnight-masks", [ROLAND], 3, { chaosBag: ["0"] }));
    r = mutate(r, (game) => {
      const downtown = allCardRecsIn(game.s).find(
        (c) => c.zone === "location" && def(game, c.id).name === "Downtown",
      )!.id;
      putEnemy(game, "01159", downtown);
      putEnemy(game, "01159", inv(game, ROLAND).location!, ROLAND);
    });
    const from = r.state.log.length;
    r = pick(r, "End turn");
    // a reaction (Dodge) may be offered before the attack: pass it
    while (r.state.pending && !r.state.log.slice(from).some((e) => e.type === "attack"))
      r = pick(r, r.state.pending.options.some((o) => o.id === "pass") ? "pass" : /./);
    const log = r.state.log.slice(from);
    const types = log
      .filter(
        (e) =>
          ["enemyMove", "attack"].includes(e.type) ||
          (e.type === "step" && e.data!.phase === "enemy"),
      )
      .map((e) => (e.type === "step" ? `step:${e.data!.step}` : e.type));
    expect(types).toEqual(["step:hunters", "enemyMove", "step:attacks", "attack"]);
  });

  it("enemy phase with nothing to do logs no step", () => {
    let r = gathering();
    const from = r.state.log.length;
    r = pick(r, "End turn");
    const s = steps(r.state.log.slice(from));
    expect(s).not.toContain("hunters");
    expect(s).not.toContain("attacks");
  });

  it("mythos: doom, then an encounter step per investigator before their card", () => {
    let r = gathering([ROLAND, DAISY]);
    while ((r.state.round < 2 || r.state.phase === "mythos") && r.state.pending)
      r = pick(r, /End turn|Roland|Daisy|./);
    const start2 = r.state.log.findIndex((e) => e.type === "phase" && e.data?.phase === "mythos");
    const log = r.state.log.slice(start2);
    const seq = log
      .filter((e) => ["step", "doom", "encounter"].includes(e.type))
      .slice(0, 6)
      .map((e) => (e.type === "step" ? `step:${e.data!.step}${e.inv ? `:${e.inv}` : ""}` : e.type));
    expect(seq).toEqual([
      "step:doom",
      "doom",
      `step:encounter:${ROLAND}`,
      "encounter",
      `step:encounter:${DAISY}`,
      "encounter",
    ]);
  });

  it("hand size: logged once, only for the investigator over the limit", () => {
    let r = gathering([ROLAND, DAISY]);
    r = mutate(r, (game) => {
      while (inv(game, ROLAND).hand.length < 10) giveCard(game, ROLAND, "01086");
    });
    const from = r.state.log.length;
    while (r.state.pending && !/discard down to 8/.test(r.state.pending.prompt))
      r = pick(r, /End turn|Roland|Daisy/);
    while (r.state.pending && /discard down to 8/.test(r.state.pending.prompt)) r = pick(r, /./);
    const hs = steps(r.state.log.slice(from)).filter((x) => String(x).startsWith("handSize"));
    expect(hs).toEqual([`handSize:${ROLAND}`]);
  });

  it("upkeep is logged before the ready (the player window comes between, Grimoire 4.1 to 4.3)", () => {
    let r = gathering();
    const from = r.state.log.length;
    r = pick(r, "End turn");
    const log = r.state.log.slice(from);
    const upkeep = log.findIndex(
      (e) => e.type === "step" && (e.data as { step?: string })?.step === "upkeep",
    );
    const ready = log.findIndex((e) => e.type === "ready");
    expect(upkeep).toBeGreaterThanOrEqual(0);
    expect(ready).toBeGreaterThan(upkeep);
  });
});

describe("phase pacing", () => {
  const paced = () =>
    skipMulligans(
      start("the-gathering", [ROLAND, DAISY], 1, { pacePhases: true, chaosBag: ["0"] }),
    );

  it("each phase waits for the lead investigator before it begins", () => {
    let r = paced();
    expect(r.state.pending).toMatchObject({
      kind: "phase",
      inv: ROLAND,
      options: [{ id: "continue" }],
    });
    expect(r.state.phase).toBe("setup");
    r = pick(r, "continue");
    expect(r.state.phase).toBe("investigation");
    // put a Ghoul on Roland, then both end their turns: the enemy phase waits, no attack yet
    r = mutate(r, (game) => void putEnemy(game, "01160", inv(game, ROLAND).location!, ROLAND));
    while (r.state.pending?.kind !== "phase") r = pick(r, /End turn|Roland|Daisy/);
    expect(r.state.pending!.step).toMatchObject({ t: "PhasePause", phase: "enemy" });
    expect(invStateIn(r.state, ROLAND).damage + invStateIn(r.state, ROLAND).horror).toBe(0);
    r = pick(r, "continue");
    expect(r.state.log.some((e) => e.type === "phase" && e.data?.phase === "enemy")).toBe(true);
    // the enemy phase resolves (the Ghoul attacks), then upkeep waits
    while (r.state.pending?.kind !== "phase") r = pick(r, /./);
    expect(r.state.pending!.step).toMatchObject({ phase: "upkeep" });
    expect(invStateIn(r.state, ROLAND).damage + invStateIn(r.state, ROLAND).horror).toBeGreaterThan(
      0,
    );
  });

  it("replays exactly; unpaced setups never pause", () => {
    const s = setup("the-gathering", [ROLAND], 3, { pacePhases: true });
    const actions: Action[] = [];
    let r = replay(db, s, []);
    for (let k = 0; k < 40 && r.state.pending; k++) {
      const a: Action = {
        type: "choose",
        inv: r.state.pending.inv,
        option: r.state.pending.options.at(-1)!.id,
      };
      actions.push(a);
      r = dispatch(db, r.state, a);
    }
    expect(actions.length).toBeGreaterThan(10);
    expect(replay(db, s, actions).state).toEqual(r.state);
    let u = gathering();
    for (let k = 0; k < 40 && u.state.pending; k++) {
      expect(u.state.pending.kind).not.toBe("phase");
      u = pick(u, /./);
    }
  });
});
