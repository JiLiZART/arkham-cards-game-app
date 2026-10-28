/**
 * The two pipes a session uses, as interfaces: the room server's socket and the mesh of peer connections. The real ones
 * (signaling.ts, mesh.ts) wrap WebSocket and RTCPeerConnection; tests plug in fakes, so the session runs in Node.
 */
import type { DeckDef } from "../content/schema";
import type { Numbered, Proposal } from "./moves";
import type { FromRoom, ToRoom } from "./protocol";

/** what peers say to each other over their data channels */
export type Wire =
  /** a player asks the host to number a move */
  | { t: "propose"; p: Proposal }
  /** the host numbered a move */
  | { t: "move"; m: Numbered }
  /** the host will not number a proposal made at log length `at`; `key` says why */
  | { t: "refused"; at: number; key: string }
  /** how long this player's log is, said when a link opens */
  | { t: "have"; n: number }
  /** please send the moves from number `from` on */
  | { t: "need"; from: number }
  | { t: "moves"; list: Numbered[] };

export type PeerState = "connecting" | "open" | "reconnecting" | "closed";

export interface IceConfig {
  iceServers: { urls: string | string[]; username?: string; credential?: string }[];
  /** TURN relays are among them */
  relay: boolean;
}

export interface MeshHandlers {
  /** relay connection setup to a player through the room server */
  sendSignal(to: string, data: unknown): void;
  onWire(from: string, w: Wire): void;
  onState(id: string, state: PeerState): void;
}

export interface Mesh {
  /** keep connections to exactly these players */
  setPeers(ids: string[]): void;
  /** connection setup from another player */
  signal(from: string, data: unknown): void;
  /** false when there is no open link to that player */
  send(to: string, w: Wire): boolean;
  broadcast(w: Wire): void;
  close(): void;
}

export type MeshFactory = (me: string, ice: IceConfig, h: MeshHandlers) => Mesh;

export type LinkState = "connecting" | "open" | "closed";

export interface LinkHandlers {
  onMessage(m: FromRoom<DeckDef>): void;
  /** the socket opened (again): the session says hello */
  onState(s: LinkState): void;
}

export interface Link {
  send(m: ToRoom<DeckDef>): void;
  close(): void;
}

export type LinkFactory = (h: LinkHandlers) => Link;
