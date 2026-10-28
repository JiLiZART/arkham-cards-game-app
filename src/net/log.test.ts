import { describe, expect, it } from "vitest";
import { MoveLog } from "./log";
import type { Move, Numbered } from "./moves";

const mv = (n: number, by = "ana"): Numbered => ({
  n,
  by,
  move: { t: "choose", inv: "01001", option: `o${n}` } satisfies Move,
});
const proposal = (at: number, by = "ana") => ({ at, by, move: mv(0).move });

describe("MoveLog as the host", () => {
  it("numbers a proposal made on the latest state", () => {
    const log = new MoveLog();
    const nm = log.next(proposal(0));
    expect(nm).toMatchObject({ n: 0, by: "ana" });
    log.receive(nm as Numbered);
    expect(log.n).toBe(1);
    expect(log.next(proposal(1))).toMatchObject({ n: 1 });
  });

  it("refuses a proposal made on an older state", () => {
    const log = new MoveLog([mv(0), mv(1)]);
    expect(log.next(proposal(1))).toBe("net.refused.stale");
  });

  it("refuses a proposal made on a state it has not reached", () => {
    expect(new MoveLog().next(proposal(3))).toBe("net.refused.stale");
  });

  it("knows the latest move", () => {
    expect(new MoveLog().last).toBeNull();
    expect(new MoveLog([mv(0), mv(1, "ben")]).last).toMatchObject({ n: 1, by: "ben" });
  });
});

describe("MoveLog as a peer", () => {
  it("applies moves in order and says which are new", () => {
    const log = new MoveLog();
    expect(log.receive(mv(0))).toEqual([mv(0)]);
    expect(log.receive(mv(1))).toEqual([mv(1)]);
    expect(log.n).toBe(2);
  });

  it("holds a move that arrives early until the gap is filled", () => {
    const log = new MoveLog();
    expect(log.receive(mv(1))).toEqual([]);
    expect(log.n).toBe(0);
    expect(log.receive(mv(0))).toEqual([mv(0), mv(1)]);
    expect(log.n).toBe(2);
  });

  it("ignores a move it already has", () => {
    const log = new MoveLog([mv(0)]);
    expect(log.receive(mv(0))).toEqual([]);
    expect(log.n).toBe(1);
  });

  it("throws on a different move at a number it already has", () => {
    const log = new MoveLog([mv(0)]);
    expect(() => log.receive(mv(0, "ben"))).toThrow(/diverged/);
  });

  it("hands out the tail from a number", () => {
    const log = new MoveLog([mv(0), mv(1), mv(2)]);
    expect(log.tail(1)).toEqual([mv(1), mv(2)]);
    expect(log.tail(3)).toEqual([]);
  });
});

describe("host takeover", () => {
  it("brings every log up to the longest by fetching its tail", () => {
    const longest = new MoveLog([mv(0), mv(1), mv(2)]);
    const behind = new MoveLog([mv(0)]);
    const applied = longest.tail(behind.n).flatMap((m) => behind.receive(m));
    expect(applied.map((m) => m.n)).toEqual([1, 2]);
    expect(behind.moves).toEqual(longest.moves);
  });

  it("numbers on from the new host's log", () => {
    const log = new MoveLog([mv(0), mv(1)]);
    expect(log.next(proposal(2))).toMatchObject({ n: 2 });
  });
});
