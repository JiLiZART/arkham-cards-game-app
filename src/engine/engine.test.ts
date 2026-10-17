import { describe, expect, it } from "vitest";
import { card, connections, def, enemyStat, findByCode, inv, invsAt, moveCard, skillValue } from "./core";
import { testParts, testValue } from "./rules/skillTest";
import { deserialize, dispatch, getLegalActions, replay, serialize } from "./engine";
import { commitDone, db, gOf, giveCard, locId, mutate, options, pick, putEnemy, setup, skipMulligans, start } from "./testkit";
import type { Action } from "./types";

const ROLAND = "01001";
const DAISY = "01002";
const SKIDS = "01003";
const AGNES = "01004";
const WENDY = "01005";

/** The Gathering, solo, chaos bag fixed to the given tokens, at the start of the first turn */
function gathering(invs = [ROLAND], bag: string[] = ["0"], seed = 1) {
  const r = start("the-gathering", invs, seed, { chaosBag: bag as never });
  return skipMulligans(r);
}

describe("state & determinism", () => {
  it("replay produces the same result", () => {
    const s = setup("the-gathering", [ROLAND, AGNES], 42);
    let r = skipMulligans(replay(db, s, []));
    const actions: Action[] = [];
    // play a few actions deterministically: always the first non-mulligan option except end turn last
    for (let k = 0; k < 40 && r.state.pending; k++) {
      const p = r.state.pending;
      const o = p.options.find((x) => /Investigate|Draw|Gain/.test(x.label)) ?? p.options[0];
      actions.push({ type: "choose", inv: p.inv, option: o.id });
      r = dispatch(db, r.state, actions.at(-1)!);
    }
    // the mulligan answers are part of the action list too
    const all: Action[] = [];
    let rr = replay(db, s, []);
    while (rr.state.pending?.kind === "mulligan") {
      const a: Action = { type: "choose", inv: rr.state.pending.inv, option: "done" };
      all.push(a);
      rr = dispatch(db, rr.state, a);
    }
    const again = replay(db, s, [...all, ...actions]);
    expect(again.state).toEqual(r.state);
  });

  it("mulligan: a picked card can be taken back before confirming", () => {
    const s = setup("the-gathering", [ROLAND], 7);
    const actions: Action[] = [];
    let r = replay(db, s, []);
    const choose = (option: string) => {
      actions.push({ type: "choose", inv: ROLAND, option });
      r = dispatch(db, r.state, actions.at(-1)!);
      if (r.error) throw new Error(r.error);
    };
    const [a, b] = r.state.invs[ROLAND].hand;
    choose(a);
    choose(b);
    expect(r.state.pending!.options.map((o) => o.id)).toEqual(expect.arrayContaining([`un:${a}`, `un:${b}`]));
    choose(`un:${a}`);
    const p = r.state.pending!;
    expect(p.kind).toBe("mulligan");
    expect(p.options.map((o) => o.id)).toContain(a); // offered for picking again
    expect(p.options.map((o) => o.id)).not.toContain(`un:${a}`);
    expect(p.options.find((o) => o.id === "done")!.label).toBe("Redraw 1 card(s)");
    choose("done");
    const hand = r.state.invs[ROLAND].hand;
    expect(hand).toContain(a);
    expect(hand).not.toContain(b);
    expect(hand).toHaveLength(5);
    expect(replay(db, s, actions).state).toEqual(r.state);
  });

  it("save and resume", () => {
    const r = gathering();
    const back = deserialize(serialize(r.state));
    expect(back).toEqual(r.state);
    expect(back.pending?.options.map((o) => o.id)).toEqual(r.state.pending?.options.map((o) => o.id));
    const a = dispatch(db, back, { type: "choose", inv: ROLAND, option: JSON.stringify({ kind: "resource" }) });
    expect(a.error).toBeUndefined();
    expect(a.state.invs[ROLAND].resources).toBe(6);
  });
});

describe("action validation", () => {
  it("rejects an illegal action without mutating state", () => {
    const r = gathering();
    const before = serialize(r.state);
    const bad = dispatch(db, r.state, { type: "choose", inv: ROLAND, option: JSON.stringify({ kind: "move", to: "nowhere" }) });
    expect(bad.error).toMatch(/illegal/);
    expect(serialize(r.state)).toBe(before);
    expect(bad.state).toBe(r.state);
  });

  it("rejects a move with no actions left", () => {
    let r = gathering();
    r = mutate(r, (g) => {
      inv(g, ROLAND).actionsLeft = 0;
    });
    expect(options(r).some((l) => /^(Investigate|Draw|Gain)/.test(l))).toBe(false);
    expect(options(r)).toContain("End turn");
  });

  it("lists legal actions for the active investigator", () => {
    const r = gathering();
    const labels = getLegalActions(db, r.state).map((o) => o.label);
    expect(labels).toContain("Investigate Study");
    expect(labels).toContain("Draw 1 card");
    expect(labels).toContain("Gain 1 resource");
    expect(labels).toContain("End turn");
  });
});

describe("round structure", () => {
  it("first round skips the mythos phase", () => {
    const r = gathering();
    expect(r.state.round).toBe(1);
    expect(r.state.phase).toBe("investigation");
    expect(card(gOf(r), r.state.agenda!).doom).toBe(0);
    expect(r.state.log.some((e) => e.type === "phase" && /Mythos/.test(e.text))).toBe(false);
  });

  it("upkeep: discard down to 8 cards", () => {
    let r = gathering();
    r = mutate(r, (g) => {
      for (const code of ["01088", "01088", "01089", "01089", "01092"]) giveCard(g, ROLAND, code);
      while (inv(g, ROLAND).hand.length < 10) giveCard(g, ROLAND, "01086");
      inv(g, ROLAND).hand.length = 10;
    });
    // end turn → enemy phase → upkeep draws 1 (11 cards) → discard 3
    r = pick(r, "End turn");
    let discards = 0;
    while (r.state.pending && /discard down to 8/.test(r.state.pending.prompt)) {
      r = pick(r, /./);
      discards++;
    }
    expect(discards).toBe(3);
    expect(r.state.invs[ROLAND].hand.length).toBe(8);
  });
});

describe("step events", () => {
  const steps = (log: { type: string; inv?: string | null; data?: Record<string, unknown> }[]) => log.filter((e) => e.type === "step").map((e) => (e.inv ? `${e.data!.step}:${e.inv}` : e.data!.step));

  it("enemy phase: hunters, then attacks, each once and before their events", () => {
    let r = skipMulligans(start("the-midnight-masks", [ROLAND], 3, { chaosBag: ["0"] as never }));
    r = mutate(r, (g) => {
      const downtown = Object.values(g.s.cards).find((c) => c.zone === "location" && def(g, c.id).name === "Downtown")!.id;
      putEnemy(g, "01159", downtown);
      putEnemy(g, "01159", inv(g, ROLAND).location!, ROLAND);
    });
    const from = r.state.log.length;
    r = pick(r, "End turn");
    // a reaction (Dodge) may be offered before the attack: pass it
    while (r.state.pending && !r.state.log.slice(from).some((e) => e.type === "attack")) r = pick(r, r.state.pending.options.some((o) => o.id === "pass") ? "pass" : /./);
    const log = r.state.log.slice(from);
    const types = log.filter((e) => ["enemyMove", "attack"].includes(e.type) || (e.type === "step" && e.data!.phase === "enemy")).map((e) => (e.type === "step" ? `step:${e.data!.step}` : e.type));
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
    while ((r.state.round < 2 || r.state.phase === "mythos") && r.state.pending) r = pick(r, /End turn|Roland|Daisy|./);
    const start2 = r.state.log.findIndex((e) => e.type === "phase" && e.data?.phase === "mythos");
    const log = r.state.log.slice(start2);
    const seq = log.filter((e) => ["step", "doom", "encounter"].includes(e.type)).slice(0, 6).map((e) => (e.type === "step" ? `step:${e.data!.step}${e.inv ? `:${e.inv}` : ""}` : e.type));
    expect(seq).toEqual(["step:doom", "doom", `step:encounter:${ROLAND}`, "encounter", `step:encounter:${DAISY}`, "encounter"]);
  });

  it("hand size: logged once, only for the investigator over the limit", () => {
    let r = gathering([ROLAND, DAISY]);
    r = mutate(r, (g) => {
      while (inv(g, ROLAND).hand.length < 10) giveCard(g, ROLAND, "01086");
    });
    const from = r.state.log.length;
    while (r.state.pending && !/discard down to 8/.test(r.state.pending.prompt)) r = pick(r, /End turn|Roland|Daisy/);
    while (r.state.pending && /discard down to 8/.test(r.state.pending.prompt)) r = pick(r, /./);
    const hs = steps(r.state.log.slice(from)).filter((x) => String(x).startsWith("handSize"));
    expect(hs).toEqual([`handSize:${ROLAND}`]);
  });

  it("upkeep is logged after the ready", () => {
    let r = gathering();
    const from = r.state.log.length;
    r = pick(r, "End turn");
    const log = r.state.log.slice(from);
    const ready = log.findIndex((e) => e.type === "ready");
    expect(log[ready + 1]).toMatchObject({ type: "step", data: { step: "upkeep" } });
  });
});

describe("phase pacing", () => {
  const paced = () => skipMulligans(start("the-gathering", [ROLAND, DAISY], 1, { pacePhases: true, chaosBag: ["0"] as never }));

  it("each phase waits for the lead investigator before it begins", () => {
    let r = paced();
    expect(r.state.pending).toMatchObject({ kind: "phase", inv: ROLAND, options: [{ id: "continue" }] });
    expect(r.state.phase).toBe("setup");
    r = pick(r, "continue");
    expect(r.state.phase).toBe("investigation");
    // put a Ghoul on Roland, then both end their turns: the enemy phase waits, no attack yet
    r = mutate(r, (g) => void putEnemy(g, "01160", inv(g, ROLAND).location!, ROLAND));
    while (r.state.pending?.kind !== "phase") r = pick(r, /End turn|Roland|Daisy/);
    expect(r.state.pending!.step).toMatchObject({ t: "PhasePause", phase: "enemy" });
    expect(r.state.invs[ROLAND].damage + r.state.invs[ROLAND].horror).toBe(0);
    r = pick(r, "continue");
    expect(r.state.log.some((e) => e.type === "phase" && e.data?.phase === "enemy")).toBe(true);
    // the enemy phase resolves (the Ghoul attacks), then upkeep waits
    while (r.state.pending?.kind !== "phase") r = pick(r, /./);
    expect(r.state.pending!.step).toMatchObject({ phase: "upkeep" });
    expect(r.state.invs[ROLAND].damage + r.state.invs[ROLAND].horror).toBeGreaterThan(0);
  });

  it("replays exactly; unpaced setups never pause", () => {
    const s = setup("the-gathering", [ROLAND], 3, { pacePhases: true });
    const actions: Action[] = [];
    let r = replay(db, s, []);
    for (let k = 0; k < 40 && r.state.pending; k++) {
      const a: Action = { type: "choose", inv: r.state.pending.inv, option: r.state.pending.options.at(-1)!.id };
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

describe("skill tests", () => {
  it("investigate success discovers a clue", () => {
    let r = gathering([ROLAND], ["-1"]);
    r = pick(r, "Investigate Study");
    r = commitDone(r); // commit window
    expect(r.state.log.some((e) => e.type === "testResult" && /= 2 vs 2 → Success/.test(e.text))).toBe(true);
    expect(r.state.invs[ROLAND].clues).toBe(1);
  });

  it("auto-fail fails regardless of skill", () => {
    let r = gathering([ROLAND], ["autoFail"]);
    r = mutate(r, (g) => {
      card(g, locId(g, "01111")).clues = 2;
    });
    r = pick(r, "Investigate Study");
    r = commitDone(r);
    expect(r.state.log.some((e) => e.type === "testResult" && /Fail \(auto-fail\)/.test(e.text))).toBe(true);
    expect(r.state.invs[ROLAND].clues).toBe(0);
  });

  it("committed icons add to the skill value", () => {
    let r = gathering([ROLAND], ["-4"]);
    r = mutate(r, (g) => {
      giveCard(g, ROLAND, "01039"); // Deduction: 1 intellect icon
      giveCard(g, ROLAND, "01093"); // Unexpected Courage: 2 wild
    });
    r = pick(r, "Investigate Study");
    r = pick(r, /Commit Unexpected Courage \(\+2\)/);
    r = pick(r, /Commit Deduction \(\+1\)/);
    r = commitDone(r);
    // 3 + 2 + 1 - 4 = 2 vs shroud 2 → success; Deduction discovers 1 extra clue
    expect(r.state.log.some((e) => e.type === "testResult" && /3 \+ 3 \(committed\) − 4 \(-4\) = 2 vs 2 → Success/.test(e.text))).toBe(true);
    expect(r.state.invs[ROLAND].clues).toBe(2);
  });

  it("skull in The Gathering counts Ghouls at your location", () => {
    let r = gathering([ROLAND], ["skull"]);
    r = mutate(r, (g) => {
      const study = locId(g, "01111");
      putEnemy(g, "01160", study, ROLAND);
      putEnemy(g, "01160", study, ROLAND);
    });
    r = pick(r, /^Fight Ghoul Minion/);
    r = commitDone(r);
    // combat 4, skull -2 (two ghouls) → 2 vs fight 2 → success
    const res = r.state.log.find((e) => e.type === "testResult")!;
    expect(res.data?.tokenTotal).toBe(-2);
  });
});

describe("chaos bag", () => {
  it("returns revealed tokens after the test", () => {
    let r = gathering([ROLAND], ["0", "-1", "skull"]);
    r = pick(r, "Investigate Study");
    r = commitDone(r);
    expect([...r.state.chaosBag].sort()).toEqual(["-1", "0", "skull"]);
  });
});

describe("basic actions & enemies", () => {
  it("attack of opportunity before drawing", () => {
    let r = gathering([ROLAND], ["0"]);
    r = mutate(r, (g) => {
      putEnemy(g, "01160", locId(g, "01111"), ROLAND);
    });
    const hand = r.state.invs[ROLAND].hand.length;
    r = pick(r, "Draw 1 card");
    // damage/horror assignment may ask (no soaking assets in starting play area)
    const attack = r.state.log.findIndex((e) => e.type === "attack");
    const draw = r.state.log.findIndex((e, k) => k > attack && e.type === "draw");
    expect(attack).toBeGreaterThan(-1);
    expect(draw).toBeGreaterThan(attack);
    expect(r.state.invs[ROLAND].damage).toBe(1);
    expect(r.state.invs[ROLAND].hand.length).toBe(hand + 1);
  });

  it("fight does not provoke attacks of opportunity", () => {
    let r = gathering([ROLAND], ["0"]);
    r = mutate(r, (g) => {
      putEnemy(g, "01160", locId(g, "01111"), ROLAND);
    });
    r = pick(r, /^Fight Ghoul Minion/);
    r = commitDone(r);
    expect(r.state.log.some((e) => e.type === "attack")).toBe(false);
  });

  it("move: engaged enemies follow, unengaged stay, destination is revealed", () => {
    let r = start("the-midnight-masks", [ROLAND], 3, { chaosBag: ["0"] as never });
    r = skipMulligans(r);
    let engaged = "";
    let other = "";
    r = mutate(r, (g) => {
      const here = inv(g, ROLAND).location!;
      engaged = putEnemy(g, "01160", here, ROLAND);
      other = putEnemy(g, "01159", here, null);
      g.s.cards[other].exhausted = true;
    });
    const target = r.state.pending!.options.find((o) => /^Move to Rivertown/.test(o.label))!;
    r = dispatch(db, r.state, { type: "choose", inv: ROLAND, option: target.id });
    while (r.state.pending?.kind === "reaction" || r.state.pending?.kind === "assign") r = pick(r, /^(Pass|Roland)/);
    const g = gOf(r);
    expect(def(g, inv(g, ROLAND).location!).name).toBe("Rivertown");
    expect(card(g, engaged).location).toBe(inv(g, ROLAND).location);
    expect(card(g, other).location).not.toBe(inv(g, ROLAND).location);
    expect(card(g, inv(g, ROLAND).location!).revealed).toBe(true);
  });

  it("hunter enemies move toward the nearest investigator", () => {
    let r = start("the-midnight-masks", [ROLAND], 3, { chaosBag: ["0"] as never });
    r = skipMulligans(r);
    let rats = "";
    r = mutate(r, (g) => {
      // investigators start at Your House; Swarm of Rats (Hunter) two steps away at Downtown
      rats = putEnemy(g, "01159", g.s.cards[Object.values(g.s.cards).find((c) => c.zone === "location" && def(g, c.id).name === "Downtown")!.id].id);
    });
    r = pick(r, "End turn");
    const g = gOf(r);
    expect(def(g, card(g, rats).location!).name).toBe("Rivertown");
  });

  it("retaliate: failing to fight a ready Retaliate enemy triggers an attack", () => {
    let r = gathering([ROLAND], ["autoFail"]);
    r = mutate(r, (g) => {
      putEnemy(g, "01116", locId(g, "01111"), ROLAND);
    });
    r = pick(r, /^Fight Ghoul Priest/);
    r = commitDone(r);
    expect(r.state.log.some((e) => e.type === "retaliate")).toBe(true);
    expect(r.state.invs[ROLAND].damage + r.state.invs[ROLAND].horror).toBeGreaterThan(0);
  });

  it("Ghoul Priest exposes its stats and keywords", () => {
    const c = db.cards["01116"];
    expect(c.enemy).toMatchObject({ fight: 4, health: 5, healthPerInvestigator: true, evade: 4, damage: 2, horror: 2 });
    expect(c.keywords).toEqual(expect.arrayContaining(["hunter", "retaliate"]));
    expect(c.victory).toBe(2);
    const r = gathering([ROLAND, AGNES]);
    const g = gOf(r);
    const priest = Object.values(g.s.cards).find((x) => x.code === "01116")!;
    expect(enemyStat(g, priest.id, "health")).toBe(10);
  });
});

describe("locations", () => {
  it("per-investigator clues", () => {
    const r = skipMulligans(start("the-gathering", [ROLAND, DAISY, SKIDS], 1));
    const g = gOf(r);
    expect(card(g, locId(g, "01111")).clues).toBe(6);
  });
});

describe("damage & defeat", () => {
  it("investigator defeated by horror", () => {
    let r = gathering([DAISY], ["0"]);
    r = mutate(r, (g) => {
      inv(g, DAISY).horror = 8;
      inv(g, DAISY).clues = 2;
      putEnemy(g, "01160", locId(g, "01111"), DAISY);
    });
    r = pick(r, "Draw 1 card"); // provokes: 1 damage 1 horror
    while (r.state.pending?.kind === "assign") r = pick(r, /investigator/);
    const g = gOf(r);
    expect(r.state.invs[DAISY].status).toBe("defeated");
    expect(r.state.invs[DAISY].mentalTrauma).toBe(1);
    expect(card(g, locId(g, "01111")).clues).toBeGreaterThanOrEqual(2);
    expect(r.state.phase === "ended" || !invsAt(g, locId(g, "01111")).includes(DAISY)).toBe(true);
    expect(r.state.resolution).toBe("none");
  });
});

describe("act & agenda", () => {
  it("agenda advances when doom reaches its threshold in the mythos phase", () => {
    let r = gathering([ROLAND], ["0"]);
    r = mutate(r, (g) => {
      card(g, g.s.agenda!).doom = 2;
    });
    const first = r.state.agenda;
    r = pick(r, "End turn");
    // round 2 mythos: doom 3 → agenda 1 advances, lead chooses
    expect(r.state.pending?.prompt).toMatch(/Choose one/);
    r = pick(r, /lead investigator takes 2 horror/);
    expect(r.state.agenda).not.toBe(first);
    expect(def(gOf(r), r.state.agenda!).name).toBe("Rise of the Ghouls");
    expect(Object.values(r.state.cards).reduce((n, c) => n + (c.zone === "agenda" ? c.doom : 0), 0)).toBe(0);
  });

  it("group clue spend advances the act", () => {
    let r = skipMulligans(start("the-gathering", [ROLAND, AGNES], 1, { chaosBag: ["0"] as never }));
    r = pick(r, "Roland Banks");
    r = mutate(r, (g) => {
      inv(g, ROLAND).clues = 3;
      inv(g, AGNES).clues = 1;
    });
    r = pick(r, /Advance act \(spend 4 clues/);
    const g = gOf(r);
    expect(inv(g, ROLAND).clues + inv(g, AGNES).clues).toBe(0);
    expect(def(g, g.s.act!).name).toBe("The Barrier");
    expect(def(g, inv(g, ROLAND).location!).name).toBe("Hallway");
  });
});

describe("encounter deck", () => {
  it("reshuffles the discard pile when empty", () => {
    let r = gathering([ROLAND], ["0"]);
    r = mutate(r, (g) => {
      for (const id of g.s.encounterDeck.slice()) {
        g.s.cards[id].zone = "encounterDiscard";
        g.s.encounterDiscard.push(id);
      }
      g.s.encounterDeck = [];
    });
    r = pick(r, "End turn");
    expect(r.state.log.some((e) => e.type === "reshuffle" && /encounter/.test(e.text))).toBe(true);
  });
});

describe("player cards", () => {
  it("slot limit: a third hand asset forces a discard", () => {
    let r = gathering([ROLAND], ["0"]);
    r = mutate(r, (g) => {
      inv(g, ROLAND).resources = 20;
      for (const code of ["01086", "01087", "01016"]) giveCard(g, ROLAND, code);
    });
    r = pick(r, /^Play Knife/);
    r = pick(r, /^Play Flashlight/);
    r = pick(r, /^Play .45 Automatic/);
    expect(r.state.pending?.prompt).toMatch(/hand slots/);
    r = pick(r, "Knife");
    const g = gOf(r);
    const inPlay = Object.values(g.s.cards).filter((c) => c.zone === "play" && c.controller === ROLAND).map((c) => def(g, c.id).name);
    expect(inPlay.sort()).toEqual([".45 Automatic", "Flashlight"]);
  });

  it("weakness drawn: revelation resolves immediately and it leaves the hand", () => {
    let r = gathering([ROLAND], ["0"]);
    r = mutate(r, (g) => {
      inv(g, ROLAND).resources = 4;
      const para = Object.values(g.s.cards).find((c) => c.code === "01097")!;
      const me = inv(g, ROLAND);
      for (const z of ["deck", "hand", "discard"] as const) me[z] = me[z].filter((x) => x !== para.id);
      me.deck.unshift(para.id);
      para.zone = "deck";
    });
    const hand = r.state.invs[ROLAND].hand.length;
    r = pick(r, "Draw 1 card");
    expect(r.state.invs[ROLAND].resources).toBe(0);
    expect(r.state.invs[ROLAND].hand.length).toBe(hand);
  });

  it("data-declared effect: Emergency Cache gains 3 resources", () => {
    let r = gathering([ROLAND], ["0"]);
    r = mutate(r, (g) => giveCard(g, ROLAND, "01088"));
    const res = r.state.invs[ROLAND].resources;
    r = pick(r, /^Play Emergency Cache/);
    expect(r.state.invs[ROLAND].resources).toBe(res + 3);
  });

  it("scripted card: Dynamite Blast runs its script", () => {
    let r = gathering([ROLAND], ["0"]);
    let ghoul = "";
    r = mutate(r, (g) => {
      inv(g, ROLAND).resources = 5;
      giveCard(g, ROLAND, "01024");
      ghoul = putEnemy(g, "01160", locId(g, "01111"), null);
      g.s.cards[ghoul].exhausted = true;
    });
    r = pick(r, /^Play Dynamite Blast/);
    while (r.state.pending?.kind === "assign") r = pick(r, /investigator/);
    expect(r.state.cards[ghoul].zone).toBe("encounterDiscard");
    expect(r.state.invs[ROLAND].damage).toBe(3);
  });

  it("Roland's reaction discovers a clue after defeating an enemy", () => {
    let r = gathering([ROLAND], ["+1"]);
    r = mutate(r, (g) => {
      putEnemy(g, "01159", locId(g, "01111"), ROLAND); // Swarm of Rats: 1 health
    });
    r = pick(r, /^Fight Swarm of Rats/);
    r = commitDone(r);
    expect(r.state.pending?.kind).toBe("reaction");
    r = pick(r, /Roland: discover 1 clue/);
    expect(r.state.invs[ROLAND].clues).toBe(1);
  });

  it("Wendy can cancel a token by discarding a card and reveal a new one", () => {
    let r = gathering([WENDY], ["+1", "0"], 5);
    const hand = r.state.invs[WENDY].hand.length;
    r = pick(r, "Investigate Study");
    r = commitDone(r);
    expect(r.state.pending?.kind).toBe("reaction");
    r = pick(r, /Wendy/);
    r = pick(r, /./); // card to discard
    expect(r.state.log.some((e) => e.type === "tokenCancelled")).toBe(true);
    expect(r.state.log.filter((e) => e.type === "token").length).toBe(2);
    expect(r.state.invs[WENDY].hand.length).toBe(hand - 1);
  });

  it("Investigator stats: Roland Banks", () => {
    const r = gathering();
    const g = gOf(r);
    expect([skillValue(g, ROLAND, "willpower"), skillValue(g, ROLAND, "intellect"), skillValue(g, ROLAND, "combat"), skillValue(g, ROLAND, "agility")]).toEqual([3, 3, 4, 2]);
    expect(db.cards[ROLAND].health).toBe(9);
    expect(db.cards[ROLAND].sanity).toBe(5);
  });
});

describe("one-way connections", () => {
  it("allow moving from → to but not back", () => {
    const r = skipMulligans(start("the-midnight-masks", [ROLAND], 3));
    const scen = db.scenarios["the-midnight-masks"];
    // Your House (01124) → Rivertown (01125) one way; the scenario's own connections are dropped for the check
    const g = { ...gOf(r), db: { ...db, scenarios: { ...db.scenarios, [scen.id]: { ...scen, connections: [], oneWay: [["01124", "01125"]] as [string, string][] } } } };
    const a = locId(g, "01124");
    const b = locId(g, "01125");
    expect(connections(g, a)).toEqual([b]);
    expect(connections(g, b)).toEqual([]);
  });
});

describe("chosen investigators", () => {
  // regression: with one investigator at the location the target was auto-picked, and the search that followed
  // then read its own answer (a card) back as the investigator, which crashed and soft-locked the game
  for (const invs of [["01002"], ["01002", "01001"]]) {
    it(`Old Book of Lore searches and adds the picked card to hand (${invs.length} investigator${invs.length > 1 ? "s" : ""})`, () => {
      let r = skipMulligans(start("the-gathering", invs, 3));
      r = mutate(r, (g) => {
        const book = Object.values(g.s.cards).find((c) => c.code === "01031")!;
        for (const i of g.s.order) for (const p of ["deck", "hand"] as const) g.s.invs[i][p] = g.s.invs[i][p].filter((x) => x !== book.id);
        Object.assign(book, { zone: "play", controller: "01002", owner: "01002" });
      });
      while (r.state.pending?.inv !== "01002" || r.state.pending.kind !== "turn") r = pick(r, r.state.pending!.options.at(-1)!.label);
      r = pick(r, /Old Book/);
      if (r.state.pending?.kind === "target") r = pick(r, "Daisy Walker");
      expect(r.state.pending?.prompt).toMatch(/Search your deck/);
      const wanted = r.state.pending!.options[0];
      r = pick(r, wanted.label);
      expect(r.state.invs["01002"].hand).toContain(wanted.value);
      expect(r.state.pending?.kind).toBe("turn");
    });
  }
});

describe("taking back committed cards", () => {
  const fightSetup = (invs = [ROLAND]) => {
    let r = gathering(invs, ["0"]);
    // two investigators: Roland takes the first turn
    if (r.state.pending?.options.some((o) => o.label === "Roland Banks")) r = pick(r, "Roland Banks");
    r = mutate(r, (g) => {
      giveCard(g, ROLAND, "01025"); // Vicious Blow: 1 combat icon
      if (invs.includes(DAISY)) giveCard(g, DAISY, "01093"); // Unexpected Courage: 2 wild
      putEnemy(g, "01160", locId(g, "01111"), ROLAND);
    });
    return pick(r, /^Fight Ghoul Minion/);
  };
  const value = (r: ReturnType<typeof gathering>) => testValue(gOf(r), r.state.skillTest!);

  it("returns the card to hand, drops its icon and asks again", () => {
    let r = fightSetup();
    expect(value(r)).toBe(4);
    r = pick(r, /^Commit Vicious Blow/);
    expect(value(r)).toBe(5);
    const blow = r.state.skillTest!.committed[0];
    r = pick(r, "Take back Vicious Blow");
    expect(r.state.invs[ROLAND].hand).toContain(blow);
    expect(r.state.cards[blow].zone).toBe("hand");
    expect(r.state.skillTest!.committed).toEqual([]);
    expect(value(r)).toBe(4);
    expect(r.state.pending?.kind).toBe("commit");
    expect(r.state.pending?.options.some((o) => o.label.startsWith("Commit Vicious Blow"))).toBe(true);
    expect(r.state.log.at(-1)?.type).toBe("uncommit");
  });

  it("the token event names the tested card, skill, value and difficulty", () => {
    let r = fightSetup();
    const ghoul = r.state.skillTest!.target;
    r = pick(r, /^Commit Vicious Blow/);
    r = commitDone(r);
    const tok = r.state.log.find((e) => e.type === "token")!;
    expect(tok.card).toBe(ghoul);
    expect(tok.data).toMatchObject({ skill: "combat", kind: "fight", value: 5, difficulty: 2 });
  });

  it("the value breakdown adds up", () => {
    let r = fightSetup();
    r = pick(r, /^Commit Vicious Blow/);
    const p = testParts(gOf(r), r.state.skillTest!);
    expect(p).toMatchObject({ base: 4, mods: 0, total: 5, difficulty: 2 });
    expect(p.icons).toEqual([{ card: r.state.skillTest!.committed[0], n: 1 }]);
    expect(p.base + p.icons.reduce((n, i) => n + i.n, 0) + p.mods).toBe(value(r));
  });

  it("is not offered once Done is chosen, nor for another investigator's card", () => {
    let r = fightSetup([ROLAND, DAISY]);
    r = pick(r, /^Commit Vicious Blow/);
    r = pick(r, "done");
    expect(r.state.pending?.inv).toBe(DAISY);
    expect(r.state.pending?.kind).toBe("commit");
    expect(r.state.pending?.options.some((o) => o.id.startsWith("un:"))).toBe(false);
  });
});

describe("reveal counter", () => {
  const rev = (r: { state: { counters: { reveal: number } } }) => r.state.counters.reveal;

  it("a move or a commit reveals nothing; a draw and the token draw do", () => {
    let r = gathering([ROLAND], ["0"]);
    r = mutate(r, (g) => void giveCard(g, ROLAND, "01025"));
    const n = rev(r);
    r = pick(r, "Investigate Study");
    r = pick(r, /^Commit/);
    expect(rev(r)).toBe(n);
    r = pick(r, "done");
    expect(rev(r)).toBe(n + 1);
    const m = rev(r);
    r = pick(r, "Draw 1 card");
    expect(rev(r)).toBe(m + 1);
  });

  it("showing deck cards for a search reveals", () => {
    let r = skipMulligans(start("the-gathering", ["01002"], 3));
    r = mutate(r, (g) => {
      const book = Object.values(g.s.cards).find((c) => c.code === "01031")!;
      g.s.invs["01002"].deck = g.s.invs["01002"].deck.filter((x) => x !== book.id);
      g.s.invs["01002"].hand = g.s.invs["01002"].hand.filter((x) => x !== book.id);
      Object.assign(book, { zone: "play", controller: "01002", owner: "01002" });
    });
    const n = rev(r);
    r = pick(r, /Old Book/);
    if (r.state.pending?.kind === "target") r = pick(r, "Daisy Walker");
    expect(r.state.pending?.prompt).toMatch(/Search your deck/);
    expect(rev(r)).toBe(n + 1);
  });

  it("random bot games: every change to decks, the bag or the RNG bumps it", () => {
    for (const seed of [1, 2, 3]) {
      let r = skipMulligans(start("the-gathering", [ROLAND, DAISY], seed));
      for (let k = 0; k < 150 && r.state.pending; k++) {
        const p = r.state.pending;
        const next = dispatch(db, r.state, { type: "choose", inv: p.inv, option: p.options[(k * 7) % p.options.length].id });
        const touched = next.state.rng !== r.state.rng || next.state.chaosBag.length < r.state.chaosBag.length
          || next.state.encounterDeck.length < r.state.encounterDeck.length
          || Object.keys(r.state.invs).some((i) => next.state.invs[i].deck.length < r.state.invs[i].deck.length);
        if (touched) expect(rev(next)).toBe(rev(r) + 1);
        r = next;
      }
    }
  });
});

describe("event sources", () => {
  it("the Attic's horror names the Attic; a Ghoul's attack names the Ghoul", () => {
    let r = gathering([ROLAND]);
    let attic = "";
    let ghoul = "";
    r = mutate(r, (g) => {
      const hall = findByCode(g, "01112", ["setAside", "location"])!.id;
      attic = findByCode(g, "01113", ["setAside", "location"])!.id;
      moveCard(g, hall, "location");
      moveCard(g, attic, "location");
      g.s.cards[hall].revealed = true;
      g.s.invs[ROLAND].location = hall;
    });
    r = pick(r, "Move to Attic");
    while (r.state.pending?.kind === "assign") r = pick(r, /./);
    const hit = r.state.log.findLast((e) => e.type === "damage");
    expect(hit?.data).toMatchObject({ horror: 1, source: attic });
    r = mutate(r, (g) => void (ghoul = putEnemy(g, "01160", attic, ROLAND)));
    while (!r.state.log.some((e) => e.type === "damage" && e.data?.source === ghoul) && r.state.pending) r = pick(r, r.state.pending.kind === "turn" ? "End turn" : /./);
    expect(r.state.log.some((e) => e.type === "damage" && e.data?.source === ghoul)).toBe(true);
  });
});
