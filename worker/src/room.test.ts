import { describe, expect, it } from "vitest";
import { PROTOCOL, type Roster } from "../../src/net/protocol";
import {
  AWAY_MS,
  claim,
  emptyRoom,
  hello,
  leave,
  noteHave,
  openOn,
  release,
  releaseAway,
  setLobby,
  start,
  type Step,
} from "./room";

const V = { app: "1.0.0", engine: 5 };
const join = (r: Roster, id: string, over: Partial<Parameters<typeof hello>[1]> = {}): Step =>
  hello(r, { id, name: id, ...V, protocol: PROTOCOL, have: 0, now: 1000, ...over });
const ok = (s: Step): Roster => {
  expect(s.error).toBeUndefined();
  return s.room;
};
const room = (...ids: string[]) => ids.reduce((r, id) => ok(join(r, id)), emptyRoom());

describe("hello", () => {
  it("makes the first player the host and fixes the room's versions", () => {
    const r = ok(join(emptyRoom(), "ana"));
    expect(r.host).toBe("ana");
    expect(r.version).toEqual(V);
    expect(r.players.ana).toMatchObject({ online: true, joinedAt: 1000 });
  });

  it("refuses a player on another build and leaves the room as it was", () => {
    const r = room("ana");
    const s = join(r, "ben", { app: "2.0.0" });
    expect(s.error).toBe("net.error.version");
    expect(s.room).toBe(r);
  });

  it("refuses a player on another engine version", () => {
    expect(join(room("ana"), "ben", { engine: 6 }).error).toBe("net.error.version");
  });

  it("refuses a player on another protocol", () => {
    expect(join(emptyRoom(), "ana", { protocol: PROTOCOL + 1 }).error).toBe("net.error.protocol");
  });

  it("brings a returning player back with their seats", () => {
    let r = room("ana", "ben");
    r = ok(claim(r, "ben", { inv: "01002", pick: { deckId: "d" } }));
    r = ok(leave(r, "ben", 5000));
    expect(r.players.ben.online).toBe(false);
    r = ok(join(r, "ben", { now: 9000 }));
    expect(r.players.ben).toMatchObject({ online: true, joinedAt: 1000 });
    expect(r.seats["01002"]).toBe("ben");
  });

  it("records the log length a player holds", () => {
    expect(ok(join(emptyRoom(), "ana", { have: 7 })).have.ana).toBe(7);
  });
});

describe("host", () => {
  it("stays with the host while they are connected", () => {
    let r = room("ana", "ben");
    r = ok(noteHave(r, "ben", 99));
    expect(r.host).toBe("ana");
  });

  it("passes to the connected player with the longest log when the host leaves", () => {
    let r = room("ana");
    r = ok(join(r, "ben", { have: 4 }));
    r = ok(join(r, "cleo", { have: 9 }));
    r = ok(leave(r, "ana", 2000));
    expect(r.host).toBe("cleo");
  });

  it("breaks a tie for the earlier arrival", () => {
    let r = room("ana");
    r = ok(join(r, "ben", { have: 4, now: 1100 }));
    r = ok(join(r, "cleo", { have: 4, now: 1200 }));
    r = ok(leave(r, "ana", 2000));
    expect(r.host).toBe("ben");
  });

  it("stays with an absent host when nobody else is connected", () => {
    const r = ok(leave(room("ana"), "ana", 2000));
    expect(r.host).toBe("ana");
  });

  it("goes to whoever returns first when the host is away", () => {
    let r = ok(leave(room("ana", "ben"), "ana", 2000));
    r = ok(leave(r, "ben", 3000));
    r = ok(join(r, "ben", { now: 4000, have: 3 }));
    expect(r.host).toBe("ben");
  });
});

describe("lobby", () => {
  it("lets only the host choose the campaign and difficulty", () => {
    const r = room("ana", "ben");
    expect(setLobby(r, "ben", { campaignId: "x" }).error).toBe("net.error.notHost");
    const next = ok(setLobby(r, "ana", { campaignId: "night-of-the-zealot", difficulty: "hard" }));
    expect(next.lobby).toEqual({ campaignId: "night-of-the-zealot", difficulty: "hard" });
  });

  it("lets a player claim an investigator with a deck, and more than one", () => {
    let r = room("ana", "ben");
    r = ok(claim(r, "ben", { inv: "01002", pick: { deckId: "agnes-starter" } }));
    r = ok(
      claim(r, "ben", { inv: "01003", pick: { deckId: "skids-starter", deck: { cards: {} } } }),
    );
    expect(r.seats).toEqual({ "01002": "ben", "01003": "ben" });
    expect(r.picks["01003"].deck).toEqual({ cards: {} });
  });

  it("refuses an investigator someone holds", () => {
    let r = room("ana", "ben");
    r = ok(claim(r, "ana", { inv: "01001", pick: { deckId: "d" } }));
    expect(claim(r, "ben", { inv: "01001", pick: { deckId: "d" } }).error).toBe("net.error.taken");
  });

  it("lets a holder change their deck", () => {
    let r = room("ana");
    r = ok(claim(r, "ana", { inv: "01001", pick: { deckId: "a" } }));
    r = ok(claim(r, "ana", { inv: "01001", pick: { deckId: "b" } }));
    expect(r.picks["01001"].deckId).toBe("b");
  });

  it("needs a deck for a lobby seat", () => {
    expect(claim(room("ana"), "ana", { inv: "01001" }).error).toBe("net.error.noSeat");
  });

  it("allows at most four seats", () => {
    let r = room("ana");
    for (const inv of ["1", "2", "3", "4"]) r = ok(claim(r, "ana", { inv, pick: { deckId: "d" } }));
    expect(claim(r, "ana", { inv: "5", pick: { deckId: "d" } }).error).toBe("net.error.noSeat");
  });

  it("lets a holder release their seat, and nobody else", () => {
    let r = room("ana", "ben");
    r = ok(claim(r, "ana", { inv: "01001", pick: { deckId: "d" } }));
    expect(release(r, "ben", "01001").error).toBe("net.error.noSeat");
    r = ok(release(r, "ana", "01001"));
    expect(r.seats).toEqual({});
    expect(r.picks).toEqual({});
  });

  it("is closed once the game started", () => {
    let r = room("ana");
    r = ok(claim(r, "ana", { inv: "01001", pick: { deckId: "d" } }));
    r = ok(start(r, "ana"));
    expect(setLobby(r, "ana", { difficulty: "easy" }).error).toBe("net.error.lobbyClosed");
    expect(claim(r, "ana", { inv: "01002", pick: { deckId: "d" } }).error).toBe("net.error.noSeat");
  });
});

describe("start", () => {
  it("is for the host, with a seat taken", () => {
    let r = room("ana", "ben");
    expect(start(r, "ana").error).toBe("net.error.nothingToStart");
    r = ok(claim(r, "ben", { inv: "01002", pick: { deckId: "d" } }));
    expect(start(r, "ben").error).toBe("net.error.notHost");
    const g = ok(start(r, "ana"));
    expect(g.mode).toBe("game");
    expect(g.invs).toEqual(["01002"]);
    expect(g.picks).toEqual({ "01002": { deckId: "d" } });
  });
});

describe("a saved campaign opened online", () => {
  it("opens its investigators as seats to claim", () => {
    let r = room("ana", "ben");
    r = ok(openOn(r, "ana", ["01001", "01002"]));
    expect(r.mode).toBe("game");
    expect(r.invs).toEqual(["01001", "01002"]);
    r = ok(claim(r, "ben", { inv: "01002" }));
    expect(r.seats).toEqual({ "01002": "ben" });
  });

  it("is for the host", () => {
    expect(openOn(room("ana", "ben"), "ben", ["01001"]).error).toBe("net.error.notHost");
  });

  it("refuses an investigator that is not in the game", () => {
    const r = ok(openOn(room("ana"), "ana", ["01001"]));
    expect(claim(r, "ana", { inv: "01009" }).error).toBe("net.error.noSeat");
  });
});

describe("releaseAway", () => {
  const away = () => {
    let r = room("ana", "ben");
    r = ok(openOn(r, "ana", ["01001", "01002"]));
    r = ok(claim(r, "ben", { inv: "01002" }));
    return ok(leave(r, "ben", 10_000));
  };

  it("frees the seats of a player gone for two minutes", () => {
    const r = ok(releaseAway(away(), "ana", "ben", 10_000 + AWAY_MS));
    expect(r.seats).toEqual({});
  });

  it("refuses sooner", () => {
    expect(releaseAway(away(), "ana", "ben", 10_000 + AWAY_MS - 1).error).toBe("net.error.notAway");
  });

  it("refuses for a player who is connected", () => {
    const r = ok(join(away(), "ben", { now: 20_000 }));
    expect(releaseAway(r, "ana", "ben", 10_000 + AWAY_MS).error).toBe("net.error.notAway");
  });

  it("is for the host", () => {
    expect(releaseAway(away(), "ben", "ana", 10_000 + AWAY_MS).error).toBe("net.error.notHost");
  });
});
