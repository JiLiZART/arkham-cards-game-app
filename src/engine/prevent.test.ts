import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createCard, inv, moveCard, push } from "./core";
import { run } from "./engine";
import { db, gOf, mutate, options, pick, skipMulligans, start } from "./testkit";
import type { Ability } from "../content/schema";
import type { Result } from "./engine";

const ROLAND = "01001";
const MACHETE = "01020";
const MINION = "01160"; // Ghoul Minion: 1 damage, 1 horror
const RATS = "01159"; // Swarm of Rats: 1 damage, 0 horror

/** the Machete, for these tests, answers an enemy attack's damage by preventing some of it (the real wards come with their cards) */
const ward = (kind: "damage" | "horror" | "either", amount = 1): Ability => ({ kind: "reaction", trigger: "attackDealsDamage", usableBy: "controller", label: "Ward", cost: { exhaust: true }, effects: [{ op: "preventDamage", amount, kind }] } as never);
let saved: Ability[];
beforeEach(() => {
  saved = db.cards[MACHETE].abilities;
});
afterEach(() => {
  db.cards[MACHETE].abilities = saved;
});

/** Roland with the Machete in play, an enemy engaged with him, and his turn ended: the enemy phase attack is next */
function attacked(enemy: string, ability?: Ability): Result {
  if (ability) db.cards[MACHETE].abilities = [ability];
  let r = skipMulligans(start("the-gathering", [ROLAND], 1, { chaosBag: ["0"] as never }));
  r = mutate(r, (g) => {
    const m = createCard(g, MACHETE, "limbo", ROLAND);
    moveCard(g, m, "play");
    const e = createCard(g, enemy, "limbo");
    moveCard(g, e, "enemy", { location: inv(g, ROLAND).location });
    g.s.cards[e].engagedWith = ROLAND;
  });
  return untilAttack(pick(r, "End turn"));
}
/** answer everything with its neutral option until the ward is offered, a turn begins again, or the attack was resolved */
function untilAttack(r: Result): Result {
  for (let k = 0; k < 60 && r.state.pending; k++) {
    const p = r.state.pending;
    if (p.kind === "turn" || p.options.some((o) => o.label === "Ward")) break;
    if (r.state.log.some((e) => e.type === "attack") && p.kind !== "assign") break;
    r = pick(r, p.options.some((o) => o.id === "pass") ? "pass" : /^Done/.test(p.options[0].label) || p.kind === "commit" ? /^Done/ : /./);
  }
  return r;
}
/** answer what is left of the attack with neutral options until the next turn */
function finish(r: Result): Result {
  for (let k = 0; k < 60 && r.state.pending && r.state.pending.kind !== "turn"; k++) r = pick(r, r.state.pending.options.some((o) => o.id === "pass") ? "pass" : /^Done/.test(r.state.pending.options[0].label) ? /^Done/ : /./);
  return r;
}
const labels = (r: Result) => options(r);
const hit = (r: Result) => ({ damage: r.state.invs[ROLAND].damage, horror: r.state.invs[ROLAND].horror });

describe("an enemy attack deals damage: a window before it is assigned", () => {
  it("offers the reaction, and preventing the damage assigns only the horror", () => {
    let r = attacked(MINION, ward("either"));
    expect(r.state.pending?.kind).toBe("reaction");
    expect(labels(r)).toContain("Ward");
    r = pick(r, "Ward");
    // both were dealt: the player chooses which to prevent
    expect(labels(r).join(" ")).toMatch(/damage/i);
    expect(labels(r).join(" ")).toMatch(/horror/i);
    r = pick(r, /damage/i);
    r = finish(r);
    expect(hit(r)).toEqual({ damage: 0, horror: 1 });
  });

  it("preventing the horror assigns only the damage", () => {
    let r = attacked(MINION, ward("either"));
    r = pick(r, "Ward");
    r = pick(r, /horror/i);
    r = finish(r);
    expect(hit(r)).toEqual({ damage: 1, horror: 0 });
  });

  it("with one kind dealt there is nothing to choose, and preventing it assigns nothing", () => {
    let r = attacked(RATS, ward("either"));
    r = pick(r, "Ward");
    r = finish(r);
    expect(hit(r)).toEqual({ damage: 0, horror: 0 });
  });

  it("a ward for horror only leaves the damage when both were dealt", () => {
    let r = attacked(MINION, ward("horror"));
    r = pick(r, "Ward");
    r = finish(r);
    expect(hit(r)).toEqual({ damage: 1, horror: 0 });
  });

  it("passing the reaction assigns everything", () => {
    let r = attacked(MINION, ward("either"));
    r = pick(r, "pass");
    r = finish(r);
    expect(hit(r)).toEqual({ damage: 1, horror: 1 });
  });

  it("an attack with nothing to answer the window asks nothing new", () => {
    let r = attacked(MINION);
    expect(r.state.pending?.options.map((o) => o.label)).not.toContain("Ward");
    r = finish(r);
    expect(hit(r)).toEqual({ damage: 1, horror: 1 });
  });

  it("damage that is not from an attack opens no window", () => {
    db.cards[MACHETE].abilities = [ward("either")];
    const r = skipMulligans(start("the-gathering", [ROLAND], 1, { chaosBag: ["0"] as never }));
    const g = gOf(r);
    g.s = structuredClone(r.state);
    const m = createCard(g, MACHETE, "limbo", ROLAND);
    moveCard(g, m, "play");
    g.s.pending = null;
    g.s.queue.length = 0;
    push(g, { t: "AssignDamage", inv: ROLAND, damage: 1, horror: 0, direct: false, source: null });
    run(g);
    expect((g.s.pending as { kind?: string } | null)?.kind).not.toBe("reaction");
    expect(g.s.invs[ROLAND].damage).toBe(1);
  });
});
