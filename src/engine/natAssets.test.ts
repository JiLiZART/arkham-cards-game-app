import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../content";
import { card, createCard, inv, moveCard, type G } from "./core";
import type { Result } from "./engine";
import { preyCandidates } from "./rules/enemies";
import { ACOLYTE, ATTIC, DAISY, HALLWAY, MINION, NATHANIEL, PRIEST, STUDY, addLocation, enemyHere, enemyIn, game, hand, inPlay, nathaniel, toTurn } from "./natkit";
import { gOf, locId, options, pick } from "./testkit";

beforeAll(async () => {
  await loadPack("investigator");
});

const N = NATHANIEL;
const offered = (name: RegExp) => (x: Result) => options(x).some((o) => name.test(o));
const finish = (r: Result) => toTurn(r);
const win = (trigger: string) => (x: Result) => x.state.pending?.step.t === "Window" && (x.state.pending.step as { trigger?: string }).trigger === trigger;
/** the combat the last fight test was made with */
const lastValue = (r: Result) => (r.state.log.filter((e) => e.type === "testResult").at(-1)!.data as { value: number }).value;
const inZone = (r: Result, code: string, zone: string) => Object.values(r.state.cards).some((c) => c.code === code && c.zone === zone);
const cardOf = (r: Result, code: string) => Object.values(r.state.cards).find((c) => c.code === code)!;
/** a card of `code` on top of the investigator's deck, `at` cards down */
function onDeck(g: G, i: string, code: string, at = 0) {
  const id = createCard(g, code, "limbo", i);
  moveCard(g, id, "hand");
  moveCard(g, id, "deck");
  const d = inv(g, i).deck;
  d.splice(d.indexOf(id), 1);
  d.splice(at, 0, id);
  return id;
}

describe("Boxing Gloves", () => {
  it.each([
    ["60105", 6, 5],
    ["60127", 7, 8],
  ])("%s: +combat while fighting; after a defeat, finds a Spirit event at the bottom of its range", (code, value, depth) => {
    let r = nathaniel((g) => {
      inPlay(g, N, code);
      enemyHere(g, N, ACOLYTE);
      onDeck(g, N, "60116", depth);
    });
    r = toTurn(pick(r, /^Fight/), offered(/^Boxing Gloves/));
    expect(lastValue(r)).toBe(value);
    r = pick(pick(r, /^Boxing Gloves/), /^Monster Slayer/);
    expect(inZone(r, "60116", "hand")).toBe(true);
    expect(cardOf(r, code).exhausted).toBe(true);
  });
  it("(0) does not see a Spirit event deeper than the top 6", () => {
    let r = nathaniel((g) => {
      inPlay(g, N, "60105");
      enemyHere(g, N, ACOLYTE);
      onDeck(g, N, "60116", 6);
    });
    r = pick(toTurn(pick(r, /^Fight/), offered(/^Boxing Gloves/)), /^Boxing Gloves/);
    expect(options(r).some((o) => /Monster Slayer/.test(o))).toBe(false);
    expect(options(r)).toContain("Take nothing");
  });
});

describe("Grete Wagner", () => {
  it("(0) +1 combat; after a defeat, takes 1 damage to discover a clue", () => {
    let r = nathaniel((g) => {
      inPlay(g, N, "60107");
      enemyHere(g, N, ACOLYTE);
    });
    r = toTurn(pick(r, /^Fight/), offered(/^Grete Wagner/));
    expect(lastValue(r)).toBe(6);
    r = finish(pick(r, /^Grete Wagner/));
    expect(r.state.invs[N].clues).toBe(1);
    expect(cardOf(r, "60107").damage).toBe(1);
    expect(cardOf(r, "60107").exhausted).toBe(true);
  });
  it("(0) is discarded when the damage is her last point of health", () => {
    let r = nathaniel((g) => {
      card(g, inPlay(g, N, "60107")).damage = 2;
      enemyHere(g, N, ACOLYTE);
    });
    r = toTurn(pick(r, /^Fight/), offered(/^Grete Wagner/));
    r = finish(pick(r, /^Grete Wagner/));
    expect(r.state.invs[N].clues).toBe(1);
    expect(inZone(r, "60107", "discard")).toBe(true);
  });
  it("(3) +1 combat and +1 intellect; discovers a clue at a connecting location", () => {
    let r = nathaniel((g) => {
      inPlay(g, N, "60128");
      enemyHere(g, N, ACOLYTE);
      card(g, locId(g, STUDY)).clues = 0;
      card(g, addLocation(g, HALLWAY, [[STUDY, HALLWAY]])).clues = 1;
    });
    r = toTurn(pick(r, /^Fight/), offered(/^Grete Wagner/));
    r = pick(r, /^Grete Wagner/);
    expect(card(gOf(r), locId(gOf(r), HALLWAY)).clues).toBe(0);
    expect(r.state.invs[N].clues).toBe(1);
  });
});

describe("Relentless", () => {
  it("keeps the excess damage, and discarding it gains that many resources", () => {
    let r = nathaniel((g) => {
      inPlay(g, N, "60109");
      hand(g, N, "60116");
      enemyHere(g, N, ACOLYTE);
    });
    r = toTurn(pick(r, /^Play Monster Slayer/), win("dealDamage"));
    r = pick(r, /^Nathaniel Cho/); // 1 + 1 + 1 = 3 on 1 health
    r = toTurn(r, win("excessDamage"));
    r = pick(r, /^Relentless/);
    r = finish(r);
    expect(cardOf(r, "60109").damage).toBe(2);
    const before = r.state.invs[N].resources;
    r = pick(r, /^Relentless: discard/);
    expect(r.state.invs[N].resources).toBe(before + 2);
    expect(inZone(r, "60109", "discard")).toBe(true);
  });
});

describe("Safeguard", () => {
  const move = (r: Result, to: RegExp) => pick(r, to);
  it("follows another investigator moving from its location", () => {
    let r = game([N, DAISY], (g) => {
      inPlay(g, N, "60110");
      addLocation(g, HALLWAY, [[STUDY, HALLWAY]]);
    });
    r = toTurn(pick(r, "End turn"), (x) => x.state.pending?.kind === "turn" && x.state.pending.inv === DAISY);
    r = toTurn(move(r, /^Move to Hallway/), offered(/^Safeguard/));
    r = pick(r, /^Safeguard/);
    expect(r.state.invs[N].location).toBe(locId(gOf(r), HALLWAY));
    expect(cardOf(r, "60110").exhausted).toBe(true);
  });
  it("is not offered for a move from another location", () => {
    let r = game([N, DAISY], (g) => {
      inPlay(g, N, "60110");
      const h = addLocation(g, HALLWAY, [[STUDY, HALLWAY]]);
      addLocation(g, ATTIC, [[HALLWAY, ATTIC]]);
      inv(g, DAISY).location = h;
    });
    r = toTurn(pick(r, "End turn"), (x) => x.state.pending?.kind === "turn" && x.state.pending.inv === DAISY);
    r = move(r, /^Move to Attic/);
    for (let k = 0; k < 20 && r.state.pending && r.state.pending.kind !== "turn"; k++) {
      expect(options(r).some((o) => /Safeguard/.test(o))).toBe(false);
      r = pick(r, r.state.pending.options.some((o) => o.id === "pass") ? "pass" : /./);
    }
  });
  it("is not offered for its own player's move", () => {
    let r = nathaniel((g) => {
      inPlay(g, N, "60110");
      addLocation(g, HALLWAY, [[STUDY, HALLWAY]]);
    });
    r = pick(r, /^Move to Hallway/);
    expect(options(r).some((o) => /Safeguard/.test(o))).toBe(false);
  });
});

describe("Physical Training (4)", () => {
  it("pays from the card first, then the pool, and is refilled each round", () => {
    let r = nathaniel((g) => {
      inPlay(g, N, "60131");
      enemyHere(g, N, ACOLYTE);
    });
    r = pick(r, /^Fight/);
    for (const used of [1, 2]) {
      r = pick(r, /^Physical Training: \+1 combat/);
      expect(cardOf(r, "60131").uses).toBe(2 - used);
      expect(r.state.invs[N].resources).toBe(5);
    }
    r = pick(r, /^Physical Training: \+1 combat/);
    expect(r.state.invs[N].resources).toBe(4);
    expect(inZone(r, "60131", "play")).toBe(true);
    r = finish(pick(r, /^Done|^done/));
    r = toTurn(pick(r, "End turn"), (x) => x.state.round === 2 && x.state.pending?.kind === "turn");
    expect(cardOf(r, "60131").uses).toBe(2);
    expect(inZone(r, "60131", "play")).toBe(true);
  });
});

describe("Randall Cho", () => {
  it("heals 3 damage", () => {
    let r = nathaniel((g) => {
      hand(g, N, "60102");
      inv(g, N).damage = 3;
    });
    r = pick(toTurn(pick(r, /^Play Randall Cho/), offered(/^Randall Cho/)), /^Randall Cho/);
    r = pick(r, /^Heal 3 damage/);
    expect(r.state.invs[N].damage).toBe(0);
  });
  it("plays a Weapon from the discard pile, paying its cost", () => {
    let r = nathaniel((g) => {
      hand(g, N, "60102");
      const gl = createCard(g, "60105", "limbo", N);
      moveCard(g, gl, "discard");
    });
    r = pick(toTurn(pick(r, /^Play Randall Cho/), offered(/^Randall Cho/)), /^Randall Cho/);
    r = pick(r, /^Search/);
    r = pick(r, /^Boxing Gloves/);
    r = finish(r);
    expect(inZone(r, "60105", "play")).toBe(true);
    expect(r.state.invs[N].resources).toBe(5 - 2 - 3);
  });
});

describe("Overpower (2)", () => {
  const fightWith = (token: string, enemy: string) => {
    let r = nathaniel((g) => {
      hand(g, N, "60126");
      enemyHere(g, N, enemy);
    }, [], [token]);
    const draws = (x: Result) => x.state.log.filter((e) => e.type === "draw" || e.type === "weakness").length;
    const before = draws(r);
    r = pick(r, /^Fight/);
    r = finish(pick(r, /^Commit Overpower/).state.pending?.kind === "commit" ? pick(pick(r, /^Commit Overpower/), "done") : pick(r, /^Commit Overpower/));
    return draws(r) - before;
  };
  it("draws 2 cards when it succeeds by 2 or more", () => {
    expect(fightWith("0", ACOLYTE)).toBe(2);
  });
  it("draws 1 card when it succeeds by less", () => {
    expect(fightWith("-4", PRIEST)).toBe(1); // 5 + 3 - 4 = 4 against 4
  });
});

describe("Nathaniel Cho", () => {
  it("adds 1 damage to an event's attack, once per phase, and not to a weapon's", () => {
    let r = nathaniel((g) => {
      hand(g, N, "60116");
      hand(g, N, "60116");
      inPlay(g, N, "60105");
      enemyHere(g, N, PRIEST);
    });
    r = toTurn(pick(r, /^Play Monster Slayer/), win("dealDamage"));
    expect(options(r).some((o) => /^Nathaniel Cho/.test(o))).toBe(true);
    r = finish(pick(r, /^Nathaniel Cho/));
    expect(enemyIn(r, PRIEST)!.damage).toBe(3);
    r = toTurn(pick(r, /^Play Monster Slayer/), win("dealDamage"));
    expect(options(r).some((o) => /^Nathaniel Cho/.test(o))).toBe(false); // once per phase
    r = finish(r);
    expect(enemyIn(r, PRIEST)).toBeUndefined(); // 3 + 2 = the Priest's 5 health: defeated
  });
  it("is not offered for a weapon's attack", () => {
    let r = nathaniel((g) => {
      inPlay(g, N, "60105");
      enemyHere(g, N, PRIEST);
    });
    r = pick(r, /^Fight/);
    for (let k = 0; k < 20 && r.state.pending?.kind !== "turn"; k++) {
      expect(options(r).some((o) => /^Nathaniel Cho/.test(o))).toBe(false);
      r = pick(r, r.state.pending!.options.some((o) => o.id === "pass") ? "pass" : /^Done/.test(r.state.pending!.options[0].label) || r.state.pending!.kind === "commit" ? /^Done/ : /./);
    }
  });
  it("elder sign: +1, and an attack that succeeds returns an event from the discard pile", () => {
    let r = nathaniel((g) => {
      moveCard(g, createCard(g, "60111", "limbo", N), "discard");
      enemyHere(g, N, ACOLYTE);
    }, [], ["elderSign"]);
    r = finish(pick(r, /^Fight/));
    expect(lastValue(r)).toBe(5);
    expect(inZone(r, "60111", "hand")).toBe(true);
  });
  it("elder sign: nothing returns outside an attack", () => {
    let r = nathaniel((g) => {
      moveCard(g, createCard(g, "60111", "limbo", N), "discard");
    }, [], ["elderSign"]);
    r = finish(pick(r, /^Investigate/));
    expect(inZone(r, "60111", "discard")).toBe(true);
  });
});

describe("Tommy Malloy", () => {
  it("is prey to Nathaniel only", () => {
    const r = game([DAISY, N], (g) => {
      enemyHere(g, N, "60103", false);
    });
    const g = gOf(r);
    const tommy = Object.values(r.state.cards).find((c) => c.code === "60103")!;
    expect(preyCandidates(g, tommy.id, [DAISY, N])).toEqual([N]);
    expect(preyCandidates(g, tommy.id, [DAISY])).toEqual([DAISY]);
  });
  it("takes only 1 of any damage", () => {
    let r = nathaniel((g) => {
      hand(g, N, "60116");
      enemyHere(g, N, "60103");
    });
    r = toTurn(pick(r, /^Play Monster Slayer/), win("dealDamage"));
    r = finish(pick(r, /^Nathaniel Cho/)); // 3 dealt
    expect(enemyIn(r, "60103")!.damage).toBe(1);
  });
});

describe("Self-Destructive", () => {
  const bearing = (prep: (g: G) => void = () => {}) =>
    nathaniel((g) => {
      const id = createCard(g, "60104", "limbo", N);
      moveCard(g, id, "threat");
      card(g, id).controller = N;
      prep(g);
    });
  it("deals its bearer 1 damage each time they damage an enemy", () => {
    let r = bearing((g) => enemyHere(g, N, PRIEST));
    r = finish(pick(r, /^Fight/));
    expect(r.state.invs[N].damage).toBe(1);
    expect(enemyIn(r, PRIEST)!.damage).toBe(1);
  });
  it("is discarded for two actions", () => {
    let r = bearing();
    r = pick(r, /^Discard Self-Destructive/);
    expect(inZone(r, "60104", "discard")).toBe(true);
    expect(r.state.invs[N].actionsLeft).toBe(1);
  });
});

void MINION;
