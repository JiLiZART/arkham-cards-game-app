/**
 * States the replay corpus's seed search reached that crashed the engine (`pnpm search:games`, "refused choices"): each
 * pinned here so it can't come back.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPack } from "../../content";
import { inv, type GameContext } from "../context";
import { locations } from "../queries";
import { moveCard } from "../movement";
import { run } from "../steps/dispatch";
import { legalTurnActions } from "../rules/round";
import { startTest } from "../rules/skillTest";
import { giveCard, gOf, skipMulligans, start } from "../kits/testkit";
import type { EffCtx } from "../world/types";
import { cardRecIn, invStateIn } from "../world/store";
import { ZONE, INV_STATUS } from "../world/constants";
import { STEP } from "../steps/step";
import { runScript } from "../rules/scripts";

const R = "01001";
const D = "01002";
const newGame = (invs = [R]): GameContext => gOf(skipMulligans(start("the-gathering", invs, 1)));
function call(game: GameContext, code: string, fn: string, ctx: EffCtx) {
  runScript(game, { t: STEP.Script, code, fn, ctx });
}
/** run a card script as the engine does: its Script step on the queue */
function resolve(game: GameContext, code: string, fn: string, ctx: EffCtx) {
  game.s.pending = null;
  game.s.queue.push({ t: STEP.Script, code, fn, ctx });
  run(game);
}

describe("an investigator defeated before their test starts", () => {
  it("takes no test (Roland's Elder Sign read the location he no longer had)", () => {
    const game = newGame([R, D]);
    invStateIn(game.s, R).status = INV_STATUS.Defeated;
    invStateIn(game.s, R).location = null;
    startTest(game, {
      inv: R,
      skill: "willpower",
      kind: "plain",
      difficulty: 3,
      label: "test",
      ctx: {},
    });
    expect(game.s.skillTest).toBeNull();
  });
});

describe("a card's effect after the action's attack of opportunity defeated its player", () => {
  const defeated = () => {
    const game = newGame([R, D]);
    invStateIn(game.s, R).status = INV_STATUS.Defeated;
    invStateIn(game.s, R).location = null;
    return game;
  };

  it("Medical Texts (01035) treats no one", () => {
    const game = defeated();
    expect(() => resolve(game, "01035", "treat", { you: R })).not.toThrow();
    expect(game.s.skillTest).toBeNull();
  });

  it("Dynamite Blast (01024) blows up nothing", () => {
    const game = defeated();
    const damage = inv(game, D).damage;
    expect(() => resolve(game, "01024", "blast", { you: R })).not.toThrow();
    expect(inv(game, D).damage).toBe(damage);
  });
});

describe("with the expansion packs", () => {
  beforeAll(async () => {
    await loadPack("core_2026");
    await loadPack("tcu");
  });

  it("Interrogate (05020): no other location with a clue, no clue elsewhere and no crash", () => {
    const game = newGame();
    const here = inv(game, R).location;
    for (const l of locations(game)) if (l.id !== here) cardRecIn(game.s, l.id).clues = 0;
    const n = game.s.queue.length;
    expect(() => call(game, "05020", "elsewhere", { you: R })).not.toThrow();
    expect(game.s.queue.length).toBe(n);
  });

  it("Lucky Charm (12061) is offered only when a card at your location has damage or horror to move to one of yours", () => {
    const game = newGame();
    const charm = giveCard(game, R, "12061");
    moveCard(game, charm, ZONE.Play);
    cardRecIn(game.s, charm).controller = R;
    cardRecIn(game.s, charm).uses = 1;
    const offered = () =>
      legalTurnActions(game, R).some((o) => o.label.startsWith("Lucky Charm: move 1 damage"));
    expect(offered()).toBe(false);
    invStateIn(game.s, R).damage = 1;
    // the damage needs another card of yours with room for it
    expect(offered()).toBe(false);
    const cop = giveCard(game, R, "01018");
    moveCard(game, cop, ZONE.Play);
    cardRecIn(game.s, cop).controller = R;
    expect(offered()).toBe(true);
  });
});
