import { describe, expect, it } from "vitest";
import { allowed, type Ctx, type Move, type Numbered } from "./moves";

const ANA = "ana";
const BEN = "ben";
const CLEO = "cleo";

/** Ana (host) holds Roland, Ben holds Agnes; Roland decides */
const ctx = (over: Partial<Ctx> = {}): Ctx => ({
  host: ANA,
  seats: { "01001": ANA, "01002": BEN },
  game: { pending: { inv: "01001" }, skillTest: null },
  undoable: true,
  last: null,
  ...over,
});
const choose = (inv: string, option = "x"): Move => ({ t: "choose", inv, option });
const lastBy = (by: string, move: Move = choose("01001")): Numbered => ({ n: 7, by, move });

describe("allowed", () => {
  it("lets the seat of the deciding investigator choose", () => {
    expect(allowed(ctx(), choose("01001"), ANA)).toBeNull();
  });

  it("refuses a choice from a player who does not hold the seat", () => {
    expect(allowed(ctx(), choose("01001"), BEN)).toBe("net.refused.seat");
  });

  it("refuses a choice for an investigator who is not deciding", () => {
    expect(allowed(ctx(), choose("01002"), BEN)).toBe("net.refused.notDeciding");
  });

  it("refuses a choice when nothing is pending", () => {
    expect(allowed(ctx({ game: null }), choose("01001"), ANA)).toBe("net.refused.notDeciding");
  });

  it("lets only the host start or load a campaign", () => {
    const newCampaign: Move = {
      t: "new",
      opts: { campaignId: "c", difficulty: "standard", seed: 1, investigators: [] },
    };
    expect(allowed(ctx(), newCampaign, ANA)).toBeNull();
    expect(allowed(ctx(), newCampaign, BEN)).toBe("net.refused.host");
    expect(allowed(ctx(), { t: "load", save: {} as never }, BEN)).toBe("net.refused.host");
  });

  it("lets any seated player (and the host) answer the flow, start and finish", () => {
    for (const m of [
      { t: "flow", value: "continue" },
      { t: "start", seed: 3 },
      { t: "finish" },
    ] as Move[]) {
      expect(allowed(ctx(), m, BEN)).toBeNull();
      expect(allowed(ctx({ seats: {} }), m, ANA)).toBeNull();
      expect(allowed(ctx(), m, CLEO)).toBe("net.refused.seat");
    }
  });

  it("lets a player upgrade only their own investigator", () => {
    const up = (inv: string): Move => ({ t: "upgrade", inv, cards: {} });
    expect(allowed(ctx(), up("01002"), BEN)).toBeNull();
    expect(allowed(ctx(), up("01001"), BEN)).toBe("net.refused.seat");
  });

  describe("undo", () => {
    it("is for the player who made the last move, while it is last", () => {
      expect(allowed(ctx({ last: lastBy(ANA) }), { t: "undo" }, ANA)).toBeNull();
    });

    it("is refused to another player", () => {
      expect(allowed(ctx({ last: lastBy(ANA) }), { t: "undo" }, BEN)).toBe("net.refused.undoBy");
    });

    it("is refused when the last move was not a choice", () => {
      const flow = lastBy(ANA, { t: "flow", value: "continue" });
      expect(allowed(ctx({ last: flow }), { t: "undo" }, ANA)).toBe("net.refused.undoBy");
    });

    it("is refused when there is no move yet", () => {
      expect(allowed(ctx(), { t: "undo" }, ANA)).toBe("net.refused.undoBy");
    });

    it("is refused below the undo floor", () => {
      expect(allowed(ctx({ last: lastBy(ANA), undoable: false }), { t: "undo" }, ANA)).toBe(
        "net.refused.undoFloor",
      );
    });
  });

  it("lets the tester's seat call a skill test off", () => {
    const testing = ctx({ game: { pending: { inv: "01001" }, skillTest: { inv: "01002" } } });
    expect(allowed(testing, { t: "cancelTest" }, BEN)).toBeNull();
    expect(allowed(testing, { t: "cancelTest" }, ANA)).toBe("net.refused.seat");
    expect(allowed(ctx(), { t: "cancelTest" }, ANA)).toBe("net.refused.notDeciding");
  });
});
