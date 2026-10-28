/**
 * The rules of a room (ADR-0019): who is in it, who hosts, which seats are held, how the lobby closes. Pure functions
 * over the roster, so the Durable Object only stores and broadcasts. Nothing here knows a game rule or sees a move.
 */
import type { DeckPick, Lobby, Roster, RoomError } from "../../src/net/protocol";
import { AWAY_MS, PROTOCOL } from "../../src/net/protocol";

export { AWAY_MS };

const MAX_SEATS = 4;

/** the roster after a change, or the room unchanged and why not */
export interface Step {
  room: Roster;
  error?: RoomError;
}

const refuse = (room: Roster, error: RoomError): Step => ({ room, error });

export function emptyRoom(): Roster {
  return {
    version: { app: "", engine: 0 },
    mode: "lobby",
    host: null,
    players: {},
    lobby: { campaignId: null, difficulty: "standard" },
    seats: {},
    picks: {},
    invs: [],
    have: {},
  };
}

/** the host stays while connected; otherwise the connected player with the longest log, the earlier arrival on a tie */
function elect(r: Roster): Roster {
  if (r.host && r.players[r.host]?.online) return r;
  const online = Object.values(r.players).filter((p) => p.online);
  if (!online.length) return r;
  online.sort((a, b) => (r.have[b.id] ?? 0) - (r.have[a.id] ?? 0) || a.joinedAt - b.joinedAt);
  return online[0].id === r.host ? r : { ...r, host: online[0].id };
}

export interface Hello {
  id: string;
  name: string;
  app: string;
  engine: number;
  protocol: number;
  have: number;
  now: number;
}

export function hello(r: Roster, h: Hello): Step {
  if (h.protocol !== PROTOCOL) return refuse(r, "net.error.protocol");
  const first = Object.keys(r.players).length === 0;
  if (!first && (r.version.app !== h.app || r.version.engine !== h.engine))
    return refuse(r, "net.error.version");
  const known = r.players[h.id];
  const next: Roster = {
    ...r,
    version: first ? { app: h.app, engine: h.engine } : r.version,
    players: {
      ...r.players,
      [h.id]: {
        id: h.id,
        name: h.name,
        online: true,
        lastSeen: h.now,
        joinedAt: known?.joinedAt ?? h.now,
      },
    },
    have: { ...r.have, [h.id]: h.have },
  };
  return { room: elect(next) };
}

export function leave(r: Roster, id: string, now: number): Step {
  const p = r.players[id];
  if (!p) return { room: r };
  const have = { ...r.have };
  delete have[id];
  return {
    room: elect({
      ...r,
      players: { ...r.players, [id]: { ...p, online: false, lastSeen: now } },
      have,
    }),
  };
}

export function noteHave(r: Roster, id: string, n: number): Step {
  if (!r.players[id]?.online) return { room: r };
  return { room: elect({ ...r, have: { ...r.have, [id]: n } }) };
}

export function rename(r: Roster, id: string, name: string): Step {
  const p = r.players[id];
  return p ? { room: { ...r, players: { ...r.players, [id]: { ...p, name } } } } : { room: r };
}

export function setLobby(r: Roster, by: string, change: Partial<Lobby>): Step {
  if (by !== r.host) return refuse(r, "net.error.notHost");
  if (r.mode !== "lobby") return refuse(r, "net.error.lobbyClosed");
  return { room: { ...r, lobby: { ...r.lobby, ...change } } };
}

export function claim(r: Roster, by: string, c: { inv: string; pick?: DeckPick }): Step {
  if (!r.players[by]) return refuse(r, "net.error.noSeat");
  const holder = r.seats[c.inv];
  if (holder && holder !== by) return refuse(r, "net.error.taken");
  if (r.mode === "game") {
    if (!r.invs.includes(c.inv)) return refuse(r, "net.error.noSeat");
    return { room: { ...r, seats: { ...r.seats, [c.inv]: by } } };
  }
  if (!c.pick?.deckId) return refuse(r, "net.error.noSeat");
  if (!holder && Object.keys(r.seats).length >= MAX_SEATS) return refuse(r, "net.error.noSeat");
  return {
    room: {
      ...r,
      seats: { ...r.seats, [c.inv]: by },
      picks: { ...r.picks, [c.inv]: c.pick },
    },
  };
}

const without = <T>(m: Record<string, T>, drop: (k: string) => boolean): Record<string, T> =>
  Object.fromEntries(Object.entries(m).filter(([k]) => !drop(k)));

export function release(r: Roster, by: string, inv: string): Step {
  if (r.seats[inv] !== by) return refuse(r, "net.error.noSeat");
  return {
    room: {
      ...r,
      seats: without(r.seats, (k) => k === inv),
      picks: without(r.picks, (k) => k === inv),
    },
  };
}

export function start(r: Roster, by: string): Step {
  if (by !== r.host) return refuse(r, "net.error.notHost");
  if (r.mode !== "lobby") return refuse(r, "net.error.lobbyClosed");
  const invs = Object.keys(r.seats);
  if (!invs.length) return refuse(r, "net.error.nothingToStart");
  return { room: { ...r, mode: "game", invs } };
}

/** the host opens the room on a campaign saved on their device: its investigators are the seats to claim */
export function openOn(r: Roster, by: string, invs: string[]): Step {
  if (by !== r.host) return refuse(r, "net.error.notHost");
  if (r.mode !== "lobby") return refuse(r, "net.error.lobbyClosed");
  if (!invs.length) return refuse(r, "net.error.nothingToStart");
  return { room: { ...r, mode: "game", invs, seats: {}, picks: {} } };
}

export function releaseAway(r: Roster, by: string, target: string, now: number): Step {
  if (by !== r.host) return refuse(r, "net.error.notHost");
  const p = r.players[target];
  if (!p || p.online || now - p.lastSeen < AWAY_MS) return refuse(r, "net.error.notAway");
  const theirs = (k: string) => r.seats[k] === target;
  return {
    room: { ...r, seats: without(r.seats, theirs), picks: without(r.picks, theirs) },
  };
}
