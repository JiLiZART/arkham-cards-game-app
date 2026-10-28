import { describe, expect, it } from "vitest";
import {
  claim as claimSeat,
  emptyRoom,
  hello,
  leave,
  noteHave,
  openOn,
  release as releaseSeat,
  releaseAway,
  setLobby,
  start as startRoom,
  type Step,
} from "../../worker/src/room";
import type { DeckDef } from "../content/schema";
import { botChoice } from "../engine/bot";
import { db } from "../engine/testkit";
import type { InvId } from "../engine/types";
import { canUndoHere, createGameStore, type Prepare, type Storage } from "../ui/state/store";
import { Session, seatMap } from "./session";
import { playerId, type FromRoom, type Roster, type ToRoom } from "./protocol";
import type { Link, LinkHandlers, Mesh, MeshHandlers, Wire } from "./transport";
import type { Numbered } from "./moves";

const ROOM = "R".repeat(22);
const ROLAND = "01001";
const DAISY = "01002";
const AGNES = "01004";

/** run what is queued: sockets, peer links and the session's own chain are all promises */
const flush = async () => {
  for (let k = 0; k < 40; k++) await new Promise((r) => setTimeout(r, 0));
};

const mem = (): Storage => {
  const data = new Map<string, string>();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
};

// ---- a room server made of the real room rules

class FakeLink implements Link {
  id: string | null = null;
  dead = false;
  constructor(
    private server: FakeServer,
    readonly h: LinkHandlers,
  ) {}
  send(m: ToRoom<DeckDef>) {
    if (!this.dead)
      void Promise.resolve().then(() => this.server.receive(this, structuredClone(m)));
  }
  deliver(m: FromRoom<DeckDef>) {
    void Promise.resolve().then(() => !this.dead && this.h.onMessage(structuredClone(m)));
  }
  close() {
    this.server.close(this);
  }
}

class FakeServer {
  roster: Roster<DeckDef> = emptyRoom() as Roster<DeckDef>;
  links = new Set<FakeLink>();
  clock = 1000;

  link = (h: LinkHandlers): Link => {
    const l = new FakeLink(this, h);
    this.links.add(l);
    void Promise.resolve().then(() => h.onState("open"));
    return l;
  };

  private apply(link: FakeLink, step: Step) {
    if (step.error) return link.deliver({ t: "error", key: step.error });
    this.roster = step.room as Roster<DeckDef>;
    this.broadcast();
  }

  private broadcast() {
    for (const l of this.links) if (l.id) l.deliver({ t: "roster", roster: this.roster });
  }

  async receive(link: FakeLink, m: ToRoom<DeckDef>) {
    const now = this.clock++;
    if (m.t === "hello") {
      const id = await playerId(m.key);
      const step = hello(this.roster, { id, ...m, now });
      if (step.error) return link.deliver({ t: "error", key: step.error });
      for (const old of this.links) if (old !== link && old.id === id) old.dead = true;
      link.id = id;
      this.roster = step.room as Roster<DeckDef>;
      link.deliver({ t: "welcome", you: id, roster: this.roster });
      return this.broadcast();
    }
    const id = link.id;
    if (!id) return;
    const r = this.roster;
    switch (m.t) {
      case "lobby":
        return this.apply(link, setLobby(r, id, m.lobby));
      case "claim":
        return this.apply(link, claimSeat(r, id, { inv: m.inv, pick: m.pick }));
      case "release":
        return this.apply(link, releaseSeat(r, id, m.inv));
      case "releaseAway":
        return this.apply(link, releaseAway(r, id, m.id, now));
      case "start":
        return this.apply(link, startRoom(r, id));
      case "open":
        return this.apply(link, openOn(r, id, m.invs));
      case "have":
        return this.apply(link, noteHave(r, id, m.n));
      case "signal":
        return;
      case "relay": {
        // as the Durable Object does: to the addressed player, stamped with the sender's own id
        for (const l of this.links)
          if (l.id === m.to && !l.dead) l.deliver({ t: "relay", from: id, w: m.w });
        return;
      }
    }
  }

  close(link: FakeLink) {
    link.dead = true;
    this.links.delete(link);
    const id = link.id;
    if (!id || [...this.links].some((l) => l.id === id && !l.dead)) return;
    this.roster = leave(this.roster, id, this.clock++).room as Roster<DeckDef>;
    this.broadcast();
  }
}

// ---- peer links made of memory

class FakeMesh implements Mesh {
  open = new Set<string>();
  closed = false;
  constructor(
    readonly me: string,
    readonly h: MeshHandlers,
    private hub: FakeHub,
  ) {}
  setPeers(ids: string[]) {
    // networks where no direct link ever opens
    if (this.hub.noLinks) return;
    for (const id of ids) {
      const other = this.hub.meshes.get(id);
      if (this.open.has(id) || !other || other.closed) continue;
      this.open.add(id);
      other.open.add(this.me);
      this.h.onState(id, "open");
      other.h.onState(this.me, "open");
    }
    for (const id of Array.from(this.open)) if (!ids.includes(id)) this.drop(id);
  }
  drop(id: string) {
    const other = this.hub.meshes.get(id);
    this.open.delete(id);
    other?.open.delete(this.me);
    this.h.onState(id, "closed");
    other?.h.onState(this.me, "closed");
  }
  signal() {}
  send(to: string, w: Wire) {
    if (!this.open.has(to)) return false;
    const other = this.hub.meshes.get(to);
    void Promise.resolve().then(() => other?.h.onWire(this.me, structuredClone(w)));
    return true;
  }
  broadcast(w: Wire) {
    for (const id of this.open) this.send(id, w);
  }
  close() {
    for (const id of Array.from(this.open)) this.drop(id);
    this.closed = true;
    this.hub.meshes.delete(this.me);
  }
}

class FakeHub {
  meshes = new Map<string, FakeMesh>();
  constructor(readonly noLinks = false) {}
  create = (me: string, h: MeshHandlers): Mesh => {
    const m = new FakeMesh(me, h, this);
    this.meshes.set(me, m);
    return m;
  };
}

// ---- players

interface Player {
  name: string;
  key: string;
  storage: Storage;
  store: ReturnType<typeof createGameStore>;
  session: Session;
  seats: InvId[] | null;
}

const world = (opts: { noLinks?: boolean } = {}) => {
  const server = new FakeServer();
  const hub = new FakeHub(opts.noLinks);
  const join = async (
    name: string,
    over: { storage?: Storage; prepare?: Prepare; tapDecks?: boolean } = {},
  ) => {
    const storage = over.storage ?? mem();
    const store = createGameStore(db, storage, over.prepare);
    store.getState().setTapDecks(over.tapDecks ?? true);
    if (over.storage) store.getState().resume();
    const p = { name, key: `key-${name}`, storage, store, seats: null } as Player;
    p.session = new Session({
      store,
      setMySeats: (s) => (p.seats = s),
      link: server.link,
      mesh: (me, _ice, h) => hub.create(me, h),
      ice: async () => ({ iceServers: [], relay: false }),
      roomId: ROOM,
      key: p.key,
      name,
      app: "dev",
      seed: () => 9,
      proposalTimeoutMs: 200,
    });
    await p.session.start();
    await flush();
    return p;
  };
  /** the browser dies: its sockets and peer links drop, with no goodbye and nothing saved on the way out */
  const crash = (p: Player) => {
    const me = p.session.net.getState().me;
    for (const l of Array.from(server.links)) if (l.id === me) server.close(l);
    hub.meshes.get(me!)?.close();
  };
  return { server, hub, join, crash };
};

/** Ana hosts Roland, Ben holds Agnes, and the campaign has started */
const started = async (opts: { noLinks?: boolean } = {}) => {
  const w = world(opts);
  const ana = await w.join("ana");
  const ben = await w.join("ben");
  ana.session.setLobby({ campaignId: "night-of-the-zealot", difficulty: "standard" });
  ana.session.claim(ROLAND, { deckId: "roland-starter" });
  ben.session.claim(AGNES, { deckId: "agnes-starter" });
  await flush();
  ana.session.startGame();
  await flush();
  return { ...w, ana, ben };
};

const answer = (p: Player, option: string) => {
  p.store.getState().skipEvents();
  p.store.getState().choose(option);
};

/** the bot plays `n` choices, each from the browser that holds the deciding seat */
const playBot = async (
  players: Player[],
  n: number,
  opts: { untilUnheld?: boolean; until?: (inv: InvId) => boolean } = {},
) => {
  for (let k = 0; k < n; k++) {
    const g = players[0].store.getState().game!;
    if (!g.pending) return;
    if (opts.until?.(g.pending.inv)) return;
    const holder = players.find((p) => p.seats?.includes(g.pending!.inv));
    if (!holder && opts.untilUnheld) return;
    if (!holder) throw new Error(`nobody holds ${g.pending.inv}`);
    answer(holder, botChoice(db, { state: g, events: [] }));
    await flush();
  }
};

const same = (a: Player, b: Player) => {
  expect(b.store.getState().campaign).toEqual(a.store.getState().campaign);
  expect(b.store.getState().setup).toEqual(a.store.getState().setup);
  expect(b.store.getState().actions).toEqual(a.store.getState().actions);
  expect(b.store.getState().game).toEqual(a.store.getState().game);
};

describe("lobby and start", () => {
  it("starts the same campaign on every browser, with the seats the players took", async () => {
    const { ana, ben } = await started();
    expect(ana.store.getState().campaign).not.toBeNull();
    expect(ana.store.getState().game?.invs[ROLAND]).toBeTruthy();
    expect(ana.store.getState().game?.invs[AGNES]).toBeTruthy();
    same(ana, ben);
    expect(ana.seats).toEqual([ROLAND]);
    expect(ben.seats).toEqual([AGNES]);
  });

  it("gives a joiner no seats until they claim one", async () => {
    const w = world();
    const ana = await w.join("ana");
    const cleo = await w.join("cleo");
    expect(ana.seats).toEqual([]);
    expect(cleo.seats).toEqual([]);
  });

  it("refuses a browser on another build, and leaves the room as it was", async () => {
    const w = world();
    await w.join("ana");
    const server = w.server;
    const store = createGameStore(db, mem());
    const odd = new Session({
      store,
      setMySeats: () => {},
      link: server.link,
      mesh: (me, _i, h) => w.hub.create(me, h),
      ice: async () => ({ iceServers: [], relay: false }),
      roomId: ROOM,
      key: "key-odd",
      name: "odd",
      app: "other-build",
    });
    await odd.start();
    await flush();
    expect(odd.net.getState().phase).toBe("refused");
    expect(odd.net.getState().notice?.key).toBe("net.error.version");
    expect(Object.keys(server.roster.players)).toHaveLength(1);
  });
});

describe("playing", () => {
  it("keeps every browser on the same game, each choice made where its seat is", async () => {
    const { ana, ben } = await started();
    await playBot([ana, ben], 70);
    expect(ana.store.getState().actions.length).toBeGreaterThan(30);
    same(ana, ben);
  });

  it("applies a move only when the host has numbered it", async () => {
    const { ana, ben } = await started();
    const g = ana.store.getState().game!;
    // Roland's mulligan: Ana answers; before the host's move comes back, her state hasn't moved
    const before = ana.store.getState().actions.length;
    answer(ana, g.pending!.options.find((o) => o.id === "done")?.id ?? g.pending!.options[0].id);
    expect(ana.store.getState().actions.length).toBe(before);
    await flush();
    expect(ana.store.getState().actions.length).toBeGreaterThan(before);
    same(ana, ben);
  });

  it("refuses a choice from a browser that doesn't hold the deciding seat, and tells it why", async () => {
    const { ana, ben } = await started();
    const g = ana.store.getState().game!;
    expect(g.pending!.inv).toBe(ROLAND);
    const before = ana.store.getState().actions;
    // Ben forces it past the screen's own gate
    ben.session.propose({ t: "choose", inv: ROLAND, option: g.pending!.options[0].id });
    await flush();
    expect(ben.session.net.getState().notice?.key).toBe("net.refused.seat");
    expect(ana.store.getState().actions).toBe(before);
    same(ana, ben);
  });

  it("refuses a proposal made on an older log", async () => {
    const { ana, ben } = await started();
    const opt = ana.store.getState().game!.pending!.options[0].id;
    // Ana's move gets numbered while Ben's, made on the old log, is on its way
    ben.session.propose({ t: "choose", inv: AGNES, option: "x" });
    answer(ana, opt);
    await flush();
    expect(["net.refused.stale", "net.refused.notDeciding"]).toContain(
      ben.session.net.getState().notice?.key,
    );
    same(ana, ben);
  });
});

describe("undo online", () => {
  const play = async () => {
    const w = await started();
    // past the mulligans (beyond Undo), then one ordinary choice by whoever decides
    for (let k = 0; k < 30 && w.ana.store.getState().game!.pending!.kind === "mulligan"; k++)
      await playBot([w.ana, w.ben], 1);
    const g = w.ana.store.getState().game!;
    expect(g.pending!.kind).not.toBe("mulligan");
    return w;
  };

  it("takes the last choice back everywhere, for the player who made it", async () => {
    const { ana, ben } = await play();
    let undone = false;
    for (let k = 0; k < 60 && !undone; k++) {
      await playBot([ana, ben], 1);
      const maker = [ana, ben].find((p) => canUndoHere(p.store.getState()));
      if (!maker) continue;
      const n = maker.store.getState().actions.length;
      maker.store.getState().undo();
      await flush();
      expect(ana.store.getState().actions.length).toBe(n - 1);
      same(ana, ben);
      undone = true;
    }
    expect(undone).toBe(true);
  });

  it("is refused to a player who didn't make the last choice", async () => {
    const { ana, ben } = await play();
    await playBot([ana, ben], 1);
    const other = [ana, ben].find(
      (p) => p.store.getState().room?.moves.at(-1)?.by !== p.session.net.getState().me,
    )!;
    const before = other.store.getState().actions.length;
    other.session.propose({ t: "undo" });
    await flush();
    expect(other.session.net.getState().notice?.key).toBe("net.refused.undoBy");
    expect(other.store.getState().actions.length).toBe(before);
  });
});

describe("rejoin", () => {
  it("brings a browser that crashed back to the same game, from its save", async () => {
    const { ana, ben, join, crash } = await started();
    await playBot([ana, ben], 6);
    const storage = ben.storage;
    const had = ben.store.getState().room!.n;
    crash(ben);
    await flush();
    // the others go on while he is away, as far as Roland's own choices reach
    await playBot([ana], 8, { untilUnheld: true });
    expect(ana.store.getState().room!.n).toBeGreaterThan(had);

    const back = await join("ben", { storage });
    // his save alone said where he was, before the room told him anything
    expect(back.store.getState().room!.id).toBe(ROOM);
    await flush();
    expect(back.seats).toEqual([AGNES]);
    same(ana, back);
    // and he plays on: Agnes's choice from the restored browser
    await playBot([ana, back], 10);
    same(ana, back);
  });

  it("brings a browser with no save to the game from the first move", async () => {
    const { ana, ben, join } = await started();
    await playBot([ana, ben], 10);
    const cleo = await join("cleo");
    await flush();
    expect(cleo.seats).toEqual([]);
    same(ana, cleo);
    expect(cleo.store.getState().room!.n).toBe(ana.store.getState().room!.n);
  });
});

describe("host takeover", () => {
  it("passes to the browser with the longest log, and play goes on", async () => {
    const { ana, ben, server, crash } = await started();
    await playBot([ana, ben], 60, { until: (inv) => inv === AGNES });
    expect(ana.store.getState().game!.pending!.inv).toBe(AGNES);
    expect(server.roster.host).toBe(ana.session.net.getState().me);

    crash(ana);
    await flush();
    expect(server.roster.host).toBe(ben.session.net.getState().me);

    // Agnes decides, on the new host's browser: he numbers the move himself
    const n = ben.store.getState().room!.n;
    answer(ben, botChoice(db, { state: ben.store.getState().game!, events: [] }));
    await flush();
    expect(ben.store.getState().room!.n).toBe(n + 1);
  });
});

describe("a saved campaign taken online", () => {
  it("opens its investigators as seats; unclaimed ones stay with the host", async () => {
    const w = world();
    const solo = createGameStore(db, mem());
    solo.getState().setTapDecks(true);
    solo.getState().newCampaign({
      campaignId: "night-of-the-zealot",
      difficulty: "standard",
      seed: 9,
      investigators: [
        { code: ROLAND, deckId: "roland-starter" },
        { code: DAISY, deckId: "daisy-starter" },
      ],
    });
    const storage = mem();
    storage.setItem("ah:save", solo.getState().exportLog().replace("{", '{"settings":{},'));
    // build the host from the solo game by loading it as the room's first move
    const ana = await w.join("ana");
    ana.store.setState({ ...solo.getState() });
    ana.session.openOnSaved();
    await flush();
    const ben = await w.join("ben");
    await flush();
    expect(ben.store.getState().campaign).toEqual(ana.store.getState().campaign);
    expect(ben.store.getState().actions).toEqual(ana.store.getState().actions);
    expect(seatMap(w.server.roster)).toEqual({
      [ROLAND]: ana.session.net.getState().me,
      [DAISY]: ana.session.net.getState().me,
    });
    ben.session.claim(DAISY);
    await flush();
    expect(ben.seats).toEqual([DAISY]);
    expect(ana.seats).toEqual([ROLAND]);
  });
});

describe("waiting for a campaign's cards", () => {
  it("holds the moves that come while the packs load, then applies them in order", async () => {
    const w = world();
    const ana = await w.join("ana");
    let release = () => {};
    const slow: Prepare = () => new Promise<void>((r) => (release = r));
    const ben = await w.join("ben", { prepare: slow });
    ana.session.setLobby({ campaignId: "night-of-the-zealot", difficulty: "standard" });
    ana.session.claim(ROLAND, { deckId: "roland-starter" });
    await flush();
    ana.session.startGame();
    await flush();
    expect(ana.store.getState().game).not.toBeNull();
    expect(ben.store.getState().game).toBeNull();
    // Ana plays while Ben's cards are still loading
    await playBot([ana], 2);
    expect(ben.store.getState().game).toBeNull();
    release();
    await flush();
    same(ana, ben);
  });
});

describe("tap decks off", () => {
  it("lets a seat's browser answer its own draws, as moves", async () => {
    const w = world();
    const ana = await w.join("ana", { tapDecks: false });
    ana.session.setLobby({ campaignId: "night-of-the-zealot", difficulty: "standard" });
    ana.session.claim(ROLAND, { deckId: "roland-starter" });
    await flush();
    ana.session.startGame();
    await flush();
    for (let k = 0; k < 120; k++) {
      const g = ana.store.getState().game!;
      if (!g.pending) break;
      answer(ana, botChoice(db, { state: g, events: [] }));
      await flush();
      const p = ana.store.getState().game!.pending;
      // a draw prompt never stays unanswered while the setting is off
      expect(p?.kind === "draw" && p.options.length === 1).toBe(false);
    }
    const draws = ana.store.getState().actions.filter((a) => a.option === "draw");
    expect(draws.length).toBeGreaterThan(0);
    // every one of them went through the room as a move
    const moved = ana.store
      .getState()
      .room!.moves.filter((m) => m.move.t === "choose" && m.move.option === "draw");
    expect(moved.length).toBe(draws.length);
  });
});

describe("a session stopped before it began", () => {
  it("leaves the store, the seats and the socket alone", async () => {
    const w = world();
    const ana = await w.join("ana");
    const second = new Session({
      store: ana.store,
      setMySeats: () => {
        throw new Error("touched the seats");
      },
      link: () => {
        throw new Error("opened a socket");
      },
      mesh: (me, _i, h) => w.hub.create(me, h),
      ice: async () => ({ iceServers: [], relay: false }),
      roomId: ROOM,
      key: "key-ana",
      name: "ana",
      app: "dev",
    });
    const starting = second.start();
    second.leave();
    await starting;
    // the first session's wiring is still the store's
    expect(ana.store.getState().net).not.toBeNull();
    expect(ana.store.getState().room?.id).toBe(ROOM);
  });
});

describe("who may send moves", () => {
  /** the very move the host would number next: legal, so only the sender check can stop it */
  const nextMove = (from: Player, by: Player): Numbered => {
    const g = from.store.getState().game!;
    return {
      n: from.store.getState().room!.n,
      by: by.session.net.getState().me!,
      move: { t: "choose", inv: g.pending!.inv, option: g.pending!.options[0].id },
    };
  };

  it("ignores a numbered move that does not come from the host", async () => {
    const { ana, ben, join, hub } = await started();
    const cleo = await join("cleo");
    await flush();
    const n = ben.store.getState().room!.n;
    hub.meshes.get(cleo.session.net.getState().me!)!.send(ben.session.net.getState().me!, {
      t: "move",
      m: nextMove(ben, ana),
    });
    await flush();
    expect(ben.store.getState().room!.n).toBe(n);
    same(ana, ben);
  });

  it("ignores moves it never asked for", async () => {
    const { ana, ben, join, hub } = await started();
    const cleo = await join("cleo");
    await flush();
    const n = ben.store.getState().room!.n;
    hub.meshes.get(cleo.session.net.getState().me!)!.send(ben.session.net.getState().me!, {
      t: "moves",
      list: [nextMove(ben, ana)],
    });
    await flush();
    expect(ben.store.getState().room!.n).toBe(n);
    same(ana, ben);
  });
});

describe("without a direct link", () => {
  it("plays a whole game through the room", async () => {
    const { ana, ben, hub } = await started({ noLinks: true });
    expect(hub.meshes.get(ana.session.net.getState().me!)!.open.size).toBe(0);
    await playBot([ana, ben], 70);
    expect(ana.store.getState().actions.length).toBeGreaterThan(30);
    same(ana, ben);
  });

  it("catches a newcomer up through the room", async () => {
    const { ana, ben, join } = await started({ noLinks: true });
    await playBot([ana, ben], 10);
    const cleo = await join("cleo");
    await flush();
    same(ana, cleo);
    expect(cleo.store.getState().room!.n).toBe(ana.store.getState().room!.n);
  });

  it("ignores a numbered move relayed by a player who isn't the host", async () => {
    const { ana, ben, join, server } = await started({ noLinks: true });
    const cleo = await join("cleo");
    await flush();
    const n = ben.store.getState().room!.n;
    const g = ben.store.getState().game!;
    const forged: Numbered = {
      n,
      by: ana.session.net.getState().me!,
      move: { t: "choose", inv: g.pending!.inv, option: g.pending!.options[0].id },
    };
    const link = [...server.links].find((l) => l.id === cleo.session.net.getState().me)!;
    link.send({ t: "relay", to: ben.session.net.getState().me!, w: { t: "move", m: forged } });
    await flush();
    expect(ben.store.getState().room!.n).toBe(n);
    same(ana, ben);
  });
});
