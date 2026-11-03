import type { ChaosToken } from "../../../content/schema";
import { describe, expect, it } from "vitest";
import { card, def, inv } from "../../context";
import { enemyStat } from "../../queries";
import { dispatch } from "../../index";
import {
  commitDone,
  db,
  gOf,
  locId,
  mutate,
  pick,
  putEnemy,
  skipMulligans,
  start,
} from "../../kits/testkit";
import { allCardRecsIn, cardRecIn, invStateIn } from "../../world/store";

const ROLAND = "01001";
const AGNES = "01004";
function gathering(invs = [ROLAND], bag: ChaosToken[] = ["0"], seed = 1) {
  const r = start("the-gathering", invs, seed, { chaosBag: bag });
  return skipMulligans(r);
}

describe("basic actions & enemies", () => {
  it("attack of opportunity before drawing", () => {
    let r = gathering([ROLAND], ["0"]);
    r = mutate(r, (game) => {
      putEnemy(game, "01160", locId(game, "01111"), ROLAND);
    });
    const hand = invStateIn(r.state, ROLAND).hand.length;
    r = pick(r, "Draw 1 card");
    // damage/horror assignment may ask (no soaking assets in starting play area)
    const attack = r.state.log.findIndex((e) => e.type === "attack");
    const draw = r.state.log.findIndex((e, k) => k > attack && e.type === "draw");
    expect(attack).toBeGreaterThan(-1);
    expect(draw).toBeGreaterThan(attack);
    expect(invStateIn(r.state, ROLAND).damage).toBe(1);
    expect(invStateIn(r.state, ROLAND).hand.length).toBe(hand + 1);
  });

  it("fight does not provoke attacks of opportunity", () => {
    let r = gathering([ROLAND], ["0"]);
    r = mutate(r, (game) => {
      putEnemy(game, "01160", locId(game, "01111"), ROLAND);
    });
    r = pick(r, /^Fight Ghoul Minion/);
    r = commitDone(r);
    expect(r.state.log.some((e) => e.type === "attack")).toBe(false);
  });

  it("move: engaged enemies follow, unengaged stay, destination is revealed", () => {
    let r = start("the-midnight-masks", [ROLAND], 3, { chaosBag: ["0"] });
    r = skipMulligans(r);
    let engaged = "";
    let other = "";
    r = mutate(r, (game) => {
      const here = inv(game, ROLAND).location!;
      engaged = putEnemy(game, "01160", here, ROLAND);
      other = putEnemy(game, "01159", here, null);
      cardRecIn(game.s, other).exhausted = true;
    });
    const target = r.state.pending!.options.find((o) => o.label.startsWith("Move to Rivertown"))!;
    r = dispatch(db, r.state, { type: "choose", inv: ROLAND, option: target.id });
    while (r.state.pending?.kind === "reaction" || r.state.pending?.kind === "assign")
      r = pick(r, /^(Pass|Roland)/);
    const game = gOf(r);
    expect(def(game, inv(game, ROLAND).location!).name).toBe("Rivertown");
    expect(card(game, engaged).location).toBe(inv(game, ROLAND).location);
    expect(card(game, other).location).not.toBe(inv(game, ROLAND).location);
    expect(card(game, inv(game, ROLAND).location!).revealed).toBe(true);
  });

  it("hunter enemies move toward the nearest investigator", () => {
    let r = start("the-midnight-masks", [ROLAND], 3, { chaosBag: ["0"] });
    r = skipMulligans(r);
    let rats = "";
    r = mutate(r, (game) => {
      // investigators start at Your House; Swarm of Rats (Hunter) two steps away at Downtown
      rats = putEnemy(
        game,
        "01159",
        cardRecIn(
          game.s,
          allCardRecsIn(game.s).find(
            (c) => c.zone === "location" && def(game, c.id).name === "Downtown",
          )!.id,
        ).id,
      );
    });
    r = pick(r, "End turn");
    const game = gOf(r);
    expect(def(game, card(game, rats).location!).name).toBe("Rivertown");
  });

  it("retaliate: failing to fight a ready Retaliate enemy triggers an attack", () => {
    let r = gathering([ROLAND], ["autoFail"]);
    r = mutate(r, (game) => {
      putEnemy(game, "01116", locId(game, "01111"), ROLAND);
    });
    r = pick(r, /^Fight Ghoul Priest/);
    r = commitDone(r);
    expect(r.state.log.some((e) => e.type === "retaliate")).toBe(true);
    expect(invStateIn(r.state, ROLAND).damage + invStateIn(r.state, ROLAND).horror).toBeGreaterThan(
      0,
    );
  });

  it("Ghoul Priest exposes its stats and keywords", () => {
    const c = db.cards["01116"];
    expect(c.enemy).toMatchObject({
      fight: 4,
      health: 5,
      healthPerInvestigator: true,
      evade: 4,
      damage: 2,
      horror: 2,
    });
    expect(c.keywords).toEqual(expect.arrayContaining(["hunter", "retaliate"]));
    expect(c.victory).toBe(2);
    const r = gathering([ROLAND, AGNES]);
    const game = gOf(r);
    const priest = allCardRecsIn(game.s).find((x) => x.code === "01116")!;
    expect(enemyStat(game, priest.id, "health")).toBe(10);
  });
});
