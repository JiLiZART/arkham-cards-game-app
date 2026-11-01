/**
 * Scripts no recorded game runs (src/engine/replays/unrun.ts) and no other test covered: each pinned here by calling
 * its functions on a prepared state, so moving it onto the engine API can't change what it does unnoticed. Where a
 * script only asks what a card is doing (in a threat area, engaged, committed), a core card stands in for its own.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../content";
import { findByCode, inv, moveCard, type G } from "./core";
import { db, giveCard, gOf, locId, putEnemy, skipMulligans, start } from "./testkit";
import type { EffCtx, SkillTestState, Step } from "./types";

const R = "01001";
const D = "01002";
const game = (scenario = "the-gathering", invs = [R], extra = {}): G =>
  gOf(skipMulligans(start(scenario, invs, 1, extra)));

/** call a script function as its Script step would, with a choice when given */
function call(g: G, code: string, fn: string, ctx: EffCtx, args?: unknown, choice?: unknown) {
  const step = { t: "Script", code, fn, ctx, args, ...(choice === undefined ? {} : { choice }) };
  db.scripts[code].fns![fn](g, ctx, args, step as Step);
}
const top = (g: G) => g.s.queue.at(-1);

describe("What Have You Done? (01110)", () => {
  it("asks the lead to burn it down or not, then queues that resolution", () => {
    const g = game("the-gathering", [R, D]);
    call(g, "01110", "back", {});
    expect(g.s.pending?.inv).toBe(R);
    expect(g.s.pending?.options.map((o) => o.id)).toEqual(["R1", "R2"]);
    const h = game("the-gathering", [R, D]);
    call(h, "01110", "back", {}, undefined, "R2");
    expect(top(h)).toEqual({ t: "Resolution", id: "R2" });
  });
});

describe("Investigating the Trail (01146)", () => {
  it("puts the Ritual Site into play and spawns each cultist who got away at the Main Path", () => {
    const g = game("the-devourer-below", [R], { campaignLog: { cultistsGotAway: ["01137"] } });
    call(g, "01146", "back", {});
    expect(findByCode(g, "01156", ["location"])).toBeDefined();
    const spawn = top(g) as Extract<Step, { t: "Spawn" }>;
    expect(spawn.t).toBe("Spawn");
    expect(g.s.cards[spawn.enemy].code).toBe("01137");
    expect(def(g, spawn.at!)).toBe("Main Path");
  });
});
const def = (g: G, id: string) => g.db.cards[g.s.cards[id].code].name;

describe("Daniela's Wrench (12002)", () => {
  it("the enemy at your location engages you and attacks, under a fresh attack key", () => {
    const g = game();
    const ghoul = putEnemy(g, "01160", inv(g, R).location!);
    const seq = g.s.seq;
    call(g, "12002", "provoke", { you: R });
    expect(g.s.cards[ghoul].engagedWith).toBe(R);
    expect(top(g)).toEqual({
      t: "EnemyAttack",
      enemy: ghoul,
      inv: R,
      aoo: false,
      key: `atk${seq}`,
    });
    expect(g.s.seq).toBe(seq + 1);
  });
});

describe("In Harm's Way (12003)", () => {
  it("is discarded at 3 damage in a threat area, and gives 1 physical trauma at the game's end", () => {
    const g = game();
    const c = giveCard(g, R, "01097");
    moveCard(g, c, "threat");
    g.s.cards[c].controller = R;
    db.scripts["12003"].hooks!.gameEnd!(g, { source: c });
    expect(inv(g, R).physicalTrauma).toBe(1);
    g.s.cards[c].damage = 3;
    call(g, "12003", "worn", { source: c });
    expect(g.s.cards[c].zone).toBe("discard");
  });
});

describe("Black Chamber Operative (12009)", () => {
  it("evaded: you place 1 of your clues on your location", () => {
    const g = game();
    const loc = inv(g, R).location!;
    g.s.invs[R].clues = 1;
    const clues = g.s.cards[loc].clues;
    call(g, "12009", "evaded", { inv: R, source: putEnemy(g, "01160", loc) });
    expect(inv(g, R).clues).toBe(0);
    expect(g.s.cards[loc].clues).toBe(clues + 1);
  });

  it("evaded with no clues: it readies, engages you and attacks", () => {
    const g = game();
    const e = putEnemy(g, "01160", inv(g, R).location!);
    g.s.cards[e].exhausted = true;
    const seq = g.s.seq;
    call(g, "12009", "evaded", { inv: R, source: e });
    expect(g.s.cards[e]).toMatchObject({ exhausted: false, engagedWith: R });
    expect(top(g)).toEqual({ t: "EnemyAttack", enemy: e, inv: R, aoo: false, key: `atk${seq}` });
  });
});

describe("Unbridled Knowledge (12043)", () => {
  it("reveals the top 5 (8 with two clues), and a card taken goes on top to be drawn", () => {
    const g = game();
    const deck = inv(g, R).deck;
    call(g, "12043", "reveal", { you: R });
    expect((top(g) as { args: { cards: string[] } }).args.cards).toEqual(deck.slice(0, 5));
    g.s.invs[R].clues = 2;
    call(g, "12043", "reveal", { you: R });
    expect((top(g) as { args: { cards: string[] } }).args.cards).toEqual(deck.slice(0, 8));
    const pick = deck[3];
    call(g, "12043", "take", { you: R }, { cards: deck.slice(0, 5), drawn: 0 }, pick);
    expect(inv(g, R).deck[0]).toBe(pick);
    expect(g.s.queue.at(-1)).toEqual({ t: "Draw", inv: R, n: 1, tapped: true });
  });

  it("each card not taken goes on the top or the bottom", () => {
    const g = game();
    const card = inv(g, R).deck[0];
    call(g, "12043", "take", { you: R }, { cards: [card], drawn: 3 }, "bottom");
    expect(inv(g, R).deck.at(-1)).toBe(card);
  });
});

describe("Lucky Charm (12061)", () => {
  it("moves 1 damage from you to an asset you control that can take it", () => {
    const g = game();
    g.s.invs[R].damage = 1;
    const cop = giveCard(g, R, "01018");
    moveCard(g, cop, "play");
    g.s.cards[cop].controller = R;
    call(g, "12061", "move", { you: R }, { kind: "damage", from: R }, cop);
    expect(inv(g, R).damage).toBe(0);
    expect(g.s.cards[cop].damage).toBe(1);
  });
});

describe("Augur of Elokoss (12070)", () => {
  it("after a symbol token, discards the Terror treachery chosen from a threat area", () => {
    const g = game();
    const frozen = giveCard(g, R, "01164");
    moveCard(g, frozen, "threat");
    g.s.skillTest = { tokens: ["skull"] } as unknown as SkillTestState;
    call(g, "12070", "augur", { you: R }, undefined, frozen);
    expect(g.s.cards[frozen].zone).not.toBe("threat");
  });

  it("does nothing without a symbol token", () => {
    const g = game();
    const frozen = giveCard(g, R, "01164");
    moveCard(g, frozen, "threat");
    g.s.skillTest = { tokens: ["-1"] } as unknown as SkillTestState;
    const before = g.s.pending;
    call(g, "12070", "augur", { you: R });
    expect(g.s.pending).toBe(before);
    expect(g.s.cards[frozen].zone).toBe("threat");
  });
});

describe("On the Brink (12084)", () => {
  it("each other card committed goes back to its owner's hand, and you draw 1", () => {
    const g = game();
    const [a, brink] = [giveCard(g, R, "01039"), giveCard(g, R, "01093")];
    for (const id of [a, brink]) moveCard(g, id, "commit");
    g.s.skillTest = { committed: [a, brink] } as unknown as SkillTestState;
    call(g, "12084", "brink", { you: R, source: brink });
    expect(g.s.cards[a].zone).toBe("hand");
    expect(g.s.cards[brink].zone).toBe("commit");
    expect(top(g)).toEqual({ t: "Draw", inv: R, n: 1 });
  });
});

describe("The Nameless Lurker (12099)", () => {
  it("at the end of the investigation phase, ready with no doom: 1 doom on it", () => {
    const g = game();
    g.s.phase = "investigation";
    const e = putEnemy(g, "01160", locId(g, "01111"));
    const n = g.s.queue.length;
    call(g, "12099", "lurk", { source: e });
    expect(top(g)).toEqual({ t: "PlaceDoom", card: e, n: 1 });
    g.s.cards[e].doom = 1;
    call(g, "12099", "lurk", { source: e });
    expect(g.s.queue.length).toBe(n + 1);
  });
});

describe("Herald of Flame (12178)", () => {
  it("after it attacks, each damaged enemy at its location heals 1", () => {
    const g = game();
    const loc = locId(g, "01111");
    const herald = putEnemy(g, "01160", loc);
    const hurt = putEnemy(g, "01160", loc);
    g.s.cards[hurt].damage = 2;
    call(g, "12178", "herald", { enemy: herald, source: herald });
    expect(g.s.cards[hurt].damage).toBe(1);
    call(g, "12178", "herald", { enemy: hurt, source: herald });
    expect(g.s.cards[hurt].damage).toBe(1);
  });
});

describe("Northside (01134)", () => {
  it("you gain 2 clues from the token pool", () => {
    const g = game();
    const clues = inv(g, R).clues;
    call(g, "01134", "gainClues", { you: R });
    expect(inv(g, R).clues).toBe(clues + 2);
  });
});

describe("Queen's Knight (12177)", () => {
  beforeAll(async () => {
    await loadPack("core_2026");
  });

  it("when it takes damage, 1 damage to Elokoss", () => {
    const g = game();
    const loc = locId(g, "01111");
    const knight = putEnemy(g, "01160", loc);
    const queen = putEnemy(g, "12179", loc);
    call(g, "12177", "knight", { enemy: knight, source: knight });
    expect(top(g)).toEqual({ t: "DamageEnemy", enemy: queen, amount: 1, by: null, source: knight });
    const n = g.s.queue.length;
    call(g, "12177", "knight", { enemy: queen, source: knight });
    expect(g.s.queue.length).toBe(n);
  });
});
