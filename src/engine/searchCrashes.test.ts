/**
 * States the replay corpus's seed search reached that crashed the engine (`pnpm search:games`, "refused choices"): each
 * pinned here so it can't come back.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../content";
import { inv, locations, moveCard, type G } from "./core";
import { run } from "./engine";
import { legalTurnActions } from "./rules/flow";
import { startTest } from "./rules/skillTest";
import { db, giveCard, gOf, skipMulligans, start } from "./testkit";
import type { EffCtx, Step } from "./types";

const R = "01001";
const D = "01002";
const game = (invs = [R]): G => gOf(skipMulligans(start("the-gathering", invs, 1)));
function call(g: G, code: string, fn: string, ctx: EffCtx) {
  db.scripts[code].fns![fn](g, ctx, undefined, { t: "Script", code, fn, ctx } as Step);
}
/** run a card script as the engine does: its Script step on the queue */
function resolve(g: G, code: string, fn: string, ctx: EffCtx) {
  g.s.pending = null;
  g.s.queue.push({ t: "Script", code, fn, ctx });
  run(g);
}

describe("an investigator defeated before their test starts", () => {
  it("takes no test (Roland's Elder Sign read the location he no longer had)", () => {
    const g = game([R, D]);
    inv(g, R).status = "defeated";
    inv(g, R).location = null;
    startTest(g, {
      inv: R,
      skill: "willpower",
      kind: "plain",
      difficulty: 3,
      label: "test",
      ctx: {},
    });
    expect(g.s.skillTest).toBeNull();
  });
});

describe("a card's effect after the action's attack of opportunity defeated its player", () => {
  const defeated = () => {
    const g = game([R, D]);
    inv(g, R).status = "defeated";
    inv(g, R).location = null;
    return g;
  };

  it("Medical Texts (01035) treats no one", () => {
    const g = defeated();
    expect(() => resolve(g, "01035", "treat", { you: R })).not.toThrow();
    expect(g.s.skillTest).toBeNull();
  });

  it("Dynamite Blast (01024) blows up nothing", () => {
    const g = defeated();
    const damage = inv(g, D).damage;
    expect(() => resolve(g, "01024", "blast", { you: R })).not.toThrow();
    expect(inv(g, D).damage).toBe(damage);
  });
});

describe("with the expansion packs", () => {
  beforeAll(async () => {
    await loadPack("core_2026");
    await loadPack("tcu");
  });

  it("Interrogate (05020): no other location with a clue, no clue elsewhere and no crash", () => {
    const g = game();
    const here = inv(g, R).location;
    for (const l of locations(g)) if (l.id !== here) l.clues = 0;
    const n = g.s.queue.length;
    expect(() => call(g, "05020", "elsewhere", { you: R })).not.toThrow();
    expect(g.s.queue.length).toBe(n);
  });

  it("Lucky Charm (12061) is offered only when a card at your location has damage or horror to move to one of yours", () => {
    const g = game();
    const charm = giveCard(g, R, "12061");
    moveCard(g, charm, "play");
    g.s.cards[charm].controller = R;
    g.s.cards[charm].uses = 1;
    const offered = () =>
      legalTurnActions(g, R).some((o) => o.label.startsWith("Lucky Charm: move 1 damage"));
    expect(offered()).toBe(false);
    inv(g, R).damage = 1;
    // the damage needs another card of yours with room for it
    expect(offered()).toBe(false);
    const cop = giveCard(g, R, "01018");
    moveCard(g, cop, "play");
    g.s.cards[cop].controller = R;
    expect(offered()).toBe(true);
  });
});
