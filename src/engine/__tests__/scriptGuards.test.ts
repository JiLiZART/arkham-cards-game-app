/**
 * Scripts no recorded game runs (src/engine/replays/unrun.ts) and no other test covered: each pinned here by calling
 * its functions on a prepared state, so moving it onto the engine API can't change what it does unnoticed. Where a
 * script only asks what a card is doing (in a threat area, engaged, committed), a core card stands in for its own.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import { findByCode } from "../queries";
import { inv, type GameContext } from "../context";
import { moveCard } from "../movement";
import { db, giveCard, gOf, locId, putEnemy, skipMulligans, start } from "../kits/testkit";
import type { EffCtx, SkillTestState, Step } from "../world/types";
import { cardRecIn, invStateIn } from "../world/store";
import { ZONE, PHASE } from "../world/constants";
import { STEP } from "../steps/step";
import { runScript } from "../rules/scripts";

const R = "01001";
const D = "01002";
const newGame = (scenario = "the-gathering", invs = [R], extra = {}): GameContext =>
  gOf(skipMulligans(start(scenario, invs, 1, extra)));

/** call a script function as its Script step would, with a choice when given */
function call(
  game: GameContext,
  code: string,
  fn: string,
  ctx: EffCtx,
  args?: unknown,
  choice?: unknown,
) {
  runScript(game, {
    t: STEP.Script,
    code,
    fn,
    ctx,
    args,
    ...(choice === undefined ? {} : { choice }),
  });
}
const top = (game: GameContext) => game.s.queue.at(-1);

describe("What Have You Done? (01110)", () => {
  it("asks the lead to burn it down or not, then queues that resolution", () => {
    const game = newGame("the-gathering", [R, D]);
    call(game, "01110", "back", {});
    expect(game.s.pending?.inv).toBe(R);
    expect(game.s.pending?.options.map((o) => o.id)).toEqual(["R1", "R2"]);
    const h = newGame("the-gathering", [R, D]);
    call(h, "01110", "back", {}, undefined, "R2");
    expect(top(h)).toEqual({ t: "Resolution", id: "R2" });
  });
});

describe("Investigating the Trail (01146)", () => {
  it("puts the Ritual Site into play and spawns each cultist who got away at the Main Path", () => {
    const game = newGame("the-devourer-below", [R], {
      campaignLog: { cultistsGotAway: ["01137"] },
    });
    call(game, "01146", "back", {});
    expect(findByCode(game, "01156", [ZONE.Location])).toBeDefined();
    const spawn = top(game) as Extract<Step, { t: "Spawn" }>;
    expect(spawn.t).toBe("Spawn");
    expect(cardRecIn(game.s, spawn.enemy).code).toBe("01137");
    expect(def(game, spawn.at!)).toBe("Main Path");
  });
});
const def = (game: GameContext, id: string) => game.db.cards[cardRecIn(game.s, id).code].name;

describe("Daniela's Wrench (12002)", () => {
  it("the enemy at your location engages you and attacks, under a fresh attack key", () => {
    const game = newGame();
    const ghoul = putEnemy(game, "01160", inv(game, R).location!);
    const seq = game.s.seq;
    call(game, "12002", "provoke", { you: R });
    expect(cardRecIn(game.s, ghoul).engagedWith).toBe(R);
    expect(top(game)).toEqual({
      t: "EnemyAttack",
      enemy: ghoul,
      inv: R,
      aoo: false,
      key: `atk${seq}`,
    });
    expect(game.s.seq).toBe(seq + 1);
  });
});

describe("In Harm's Way (12003)", () => {
  it("is discarded at 3 damage in a threat area, and gives 1 physical trauma at the game's end", () => {
    const game = newGame();
    const c = giveCard(game, R, "01097");
    moveCard(game, c, ZONE.Threat);
    cardRecIn(game.s, c).controller = R;
    db.scripts["12003"].hooks!.gameEnd!(game, { source: c });
    expect(inv(game, R).physicalTrauma).toBe(1);
    cardRecIn(game.s, c).damage = 3;
    call(game, "12003", "worn", { source: c });
    expect(cardRecIn(game.s, c).zone).toBe("discard");
  });
});

describe("Black Chamber Operative (12009)", () => {
  it("evaded: you place 1 of your clues on your location", () => {
    const game = newGame();
    const loc = inv(game, R).location!;
    invStateIn(game.s, R).clues = 1;
    const clues = cardRecIn(game.s, loc).clues;
    call(game, "12009", "evaded", { inv: R, source: putEnemy(game, "01160", loc) });
    expect(inv(game, R).clues).toBe(0);
    expect(cardRecIn(game.s, loc).clues).toBe(clues + 1);
  });

  it("evaded with no clues: it readies, engages you and attacks", () => {
    const game = newGame();
    const e = putEnemy(game, "01160", inv(game, R).location!);
    cardRecIn(game.s, e).exhausted = true;
    const seq = game.s.seq;
    call(game, "12009", "evaded", { inv: R, source: e });
    expect(cardRecIn(game.s, e)).toMatchObject({ exhausted: false, engagedWith: R });
    expect(top(game)).toEqual({ t: "EnemyAttack", enemy: e, inv: R, aoo: false, key: `atk${seq}` });
  });
});

describe("Unbridled Knowledge (12043)", () => {
  it("reveals the top 5 (8 with two clues), and a card taken goes on top to be drawn", () => {
    const game = newGame();
    const deck = inv(game, R).deck;
    call(game, "12043", "reveal", { you: R });
    expect((top(game) as { args: { cards: string[] } }).args.cards).toEqual(deck.slice(0, 5));
    invStateIn(game.s, R).clues = 2;
    call(game, "12043", "reveal", { you: R });
    expect((top(game) as { args: { cards: string[] } }).args.cards).toEqual(deck.slice(0, 8));
    const pick = deck[3];
    call(game, "12043", "take", { you: R }, { cards: deck.slice(0, 5), drawn: 0 }, pick);
    expect(inv(game, R).deck[0]).toBe(pick);
    expect(game.s.queue.at(-1)).toEqual({ t: "Draw", inv: R, n: 1, tapped: true });
  });

  it("each card not taken goes on the top or the bottom", () => {
    const game = newGame();
    const card = inv(game, R).deck[0];
    call(game, "12043", "take", { you: R }, { cards: [card], drawn: 3 }, "bottom");
    expect(inv(game, R).deck.at(-1)).toBe(card);
  });
});

describe("Lucky Charm (12061)", () => {
  it("moves 1 damage from you to an asset you control that can take it", () => {
    const game = newGame();
    invStateIn(game.s, R).damage = 1;
    const cop = giveCard(game, R, "01018");
    moveCard(game, cop, ZONE.Play);
    cardRecIn(game.s, cop).controller = R;
    call(game, "12061", "move", { you: R }, { kind: "damage", from: R }, cop);
    expect(inv(game, R).damage).toBe(0);
    expect(cardRecIn(game.s, cop).damage).toBe(1);
  });
});

describe("Augur of Elokoss (12070)", () => {
  it("after a symbol token, discards the Terror treachery chosen from a threat area", () => {
    const game = newGame();
    const frozen = giveCard(game, R, "01164");
    moveCard(game, frozen, ZONE.Threat);
    game.s.skillTest = { tokens: ["skull"] } as unknown as SkillTestState;
    call(game, "12070", "augur", { you: R }, undefined, frozen);
    expect(cardRecIn(game.s, frozen).zone).not.toBe("threat");
  });

  it("does nothing without a symbol token", () => {
    const game = newGame();
    const frozen = giveCard(game, R, "01164");
    moveCard(game, frozen, ZONE.Threat);
    game.s.skillTest = { tokens: ["-1"] } as unknown as SkillTestState;
    const before = game.s.pending;
    call(game, "12070", "augur", { you: R });
    expect(game.s.pending).toBe(before);
    expect(cardRecIn(game.s, frozen).zone).toBe("threat");
  });
});

describe("On the Brink (12084)", () => {
  it("each other card committed goes back to its owner's hand, and you draw 1", () => {
    const game = newGame();
    const [a, brink] = [giveCard(game, R, "01039"), giveCard(game, R, "01093")];
    for (const id of [a, brink]) moveCard(game, id, ZONE.Commit);
    game.s.skillTest = { committed: [a, brink] } as unknown as SkillTestState;
    call(game, "12084", "brink", { you: R, source: brink });
    expect(cardRecIn(game.s, a).zone).toBe("hand");
    expect(cardRecIn(game.s, brink).zone).toBe("commit");
    expect(top(game)).toEqual({ t: "Draw", inv: R, n: 1 });
  });
});

describe("The Nameless Lurker (12099)", () => {
  it("at the end of the investigation phase, ready with no doom: 1 doom on it", () => {
    const game = newGame();
    game.s.phase = PHASE.Investigation;
    const e = putEnemy(game, "01160", locId(game, "01111"));
    const n = game.s.queue.length;
    call(game, "12099", "lurk", { source: e });
    expect(top(game)).toEqual({ t: "PlaceDoom", card: e, n: 1 });
    cardRecIn(game.s, e).doom = 1;
    call(game, "12099", "lurk", { source: e });
    expect(game.s.queue.length).toBe(n + 1);
  });
});

describe("Herald of Flame (12178)", () => {
  it("after it attacks, each damaged enemy at its location heals 1", () => {
    const game = newGame();
    const loc = locId(game, "01111");
    const herald = putEnemy(game, "01160", loc);
    const hurt = putEnemy(game, "01160", loc);
    cardRecIn(game.s, hurt).damage = 2;
    call(game, "12178", "herald", { enemy: herald, source: herald });
    expect(cardRecIn(game.s, hurt).damage).toBe(1);
    call(game, "12178", "herald", { enemy: hurt, source: herald });
    expect(cardRecIn(game.s, hurt).damage).toBe(1);
  });
});

describe("Northside (01134)", () => {
  it("you gain 2 clues from the token pool", () => {
    const game = newGame();
    const clues = inv(game, R).clues;
    call(game, "01134", "gainClues", { you: R });
    expect(inv(game, R).clues).toBe(clues + 2);
  });
});

describe("Queen's Knight (12177)", () => {
  beforeAll(async () => {
    await loadPack("core_2026");
  });

  it("when it takes damage, 1 damage to Elokoss", () => {
    const game = newGame();
    const loc = locId(game, "01111");
    const knight = putEnemy(game, "01160", loc);
    const queen = putEnemy(game, "12179", loc);
    call(game, "12177", "knight", { enemy: knight, source: knight });
    expect(top(game)).toEqual({
      t: "DamageEnemy",
      enemy: queen,
      amount: 1,
      by: null,
      source: knight,
    });
    const n = game.s.queue.length;
    call(game, "12177", "knight", { enemy: queen, source: knight });
    expect(game.s.queue.length).toBe(n);
  });
});
