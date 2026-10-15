import { describe, expect, it } from "vitest";
import { card, connections, def, enemyStat, inv, invsAt, skillValue } from "./core";
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
