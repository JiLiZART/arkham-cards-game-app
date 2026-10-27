import { describe, expect, it } from "vitest";
import { dispatch } from "../../engine/engine";
import { db, skipMulligans, start } from "../../engine/testkit";
import type { GameState } from "../../engine/types";
import { pickTip, type TipContext } from "./tips";

const R = "01001";
const ctx = (patch: Partial<TipContext> = {}): TipContext => ({
  viewer: R,
  shown: true,
  canUndo: false,
  drawing: false,
  phone: false,
  ...patch,
});
const pick = (g: GameState, seen: string[] = [], c = ctx(), on = true) =>
  pickTip(g, c, new Set(seen), on)?.id ?? null;
const choose = (g: GameState, label: RegExp) => {
  const r = dispatch(db, g, {
    type: "choose",
    inv: g.pending!.inv,
    option: g.pending!.options.find((o) => label.test(o.label))!.id,
  });
  if (r.error) throw new Error(r.error);
  return r.state;
};

describe("pickTip", () => {
  const fresh = skipMulligans(start("the-gathering", [R], 1)).state;

  it("the mulligan, then the scenario start on the first turn", () => {
    expect(pick(start("the-gathering", [R], 1).state)).toBe("mulligan");
    expect(fresh.pending!.kind).toBe("turn");
    expect(pick(fresh)).toBe("start");
  });

  it("on a phone the first turn opens with how to tap: look, then choose", () => {
    expect(pick(fresh, [], ctx({ phone: true }))).toBe("phoneTap");
    expect(pick(fresh, ["phoneTap"], ctx({ phone: true }))).toBe("start");
    expect(pick(fresh)).toBe("start");
  });

  it("the turn tip on the first turn only: once seen, the next situation's tip", () => {
    expect(pick(fresh, ["start"])).toBe("turn");
    expect(pick(fresh, ["start", "turn"])).toBe("investigate");
  });

  it("the skill test tip during the tester's commit prompt", () => {
    const g = choose(fresh, /^Investigate/);
    expect(g.pending!.kind).toBe("commit");
    expect(pick(g)).toBe("test");
    // the chaos draw waits for the tap: its tip
    expect(pick(g, ["test"], ctx({ drawing: true }))).toBe("token");
  });

  it("undo once something can be taken back", () => {
    const g = choose(fresh, /^Gain 1 resource/);
    const seen = ["start", "turn", "investigate", "move", "play"];
    expect(pick(g, seen)).toBeNull();
    expect(pick(g, seen, ctx({ canUndo: true }))).toBe("undo");
  });

  it("nothing for a hand behind the hand-off screen, nothing with tips off, nothing when all are seen", () => {
    expect(pick(fresh, [], ctx({ shown: false }))).toBeNull();
    expect(pick(fresh, [], ctx(), false)).toBeNull();
    expect(pick(fresh, ["start", "turn", "investigate", "move", "play", "undo"])).toBeNull();
  });

  it("the phase pause tips speak to everyone, even while hands are private", () => {
    const mythos: GameState = {
      ...fresh,
      pending: { ...fresh.pending!, kind: "phase", step: { t: "PhasePause", phase: "mythos" } },
    };
    expect(pick(mythos, [], ctx({ shown: false }))).toBe("mythos");
  });

  it("an enemy with the viewer points at it", () => {
    const study = fresh.invs[R].location!;
    const ghoul = Object.values(fresh.cards).find((c) => c.code === "01160")!.id;
    const g: GameState = {
      ...fresh,
      cards: {
        ...fresh.cards,
        [ghoul]: { ...fresh.cards[ghoul], zone: "enemy", location: study, engagedWith: R },
      },
    };
    const tip = pickTip(g, ctx(), new Set(["start", "turn"]), true)!;
    expect(tip.id).toBe("enemy");
    expect(tip.anchor(g, ctx())).toEqual({ card: ghoul });
  });
});
