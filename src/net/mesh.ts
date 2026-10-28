/**
 * Peer connections, one per pair of players, each with one reliable data channel for moves (and, later, chat). The
 * player with the smaller id makes the offer, so offers never cross. A peer that comes back from a crash is a new
 * connection with a new `gen`; the other side notices and starts over, so a stale connection never lingers.
 */
import { randomToken } from "./protocol";
import type { IceConfig, Mesh, MeshHandlers, PeerState, Wire } from "./transport";

/** one of the two players offers: the one whose id sorts first */
export const isInitiator = (me: string, other: string): boolean => me < other;

/** a channel both sides create with the same id, so no offer has to carry it */
const CHANNEL = { negotiated: true, id: 0, ordered: true } as const;
/** how long a connection may stay "disconnected" before the offering side restarts ICE */
const RESTART_AFTER_MS = 3000;

/** connection setup as it travels through the room server */
interface Signal {
  /** the sender's connection instance */
  gen: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  /** a fresh answering side says it is ready for an offer */
  hi?: true;
}

interface Peer {
  id: string;
  gen: string;
  pc: RTCPeerConnection;
  dc: RTCDataChannel;
  state: PeerState;
  /** the other side's instance we are talking to */
  remoteGen: string | null;
  early: RTCIceCandidateInit[];
  restart: ReturnType<typeof setTimeout> | null;
}

export function createMesh(
  me: string,
  ice: IceConfig,
  h: MeshHandlers,
  Rtc: typeof RTCPeerConnection = RTCPeerConnection,
): Mesh {
  const peers = new Map<string, Peer>();
  /** setup that arrived before the roster named its sender a peer */
  const waiting = new Map<string, Signal[]>();

  const setState = (p: Peer, state: PeerState) => {
    if (p.state === state || peers.get(p.id) !== p) return;
    p.state = state;
    h.onState(p.id, state);
  };

  const build = (id: string): Peer => {
    const pc = new Rtc({ iceServers: ice.iceServers });
    const dc = pc.createDataChannel("moves", CHANNEL);
    const p: Peer = {
      id,
      gen: randomToken(6),
      pc,
      dc,
      state: "connecting",
      remoteGen: null,
      early: [],
      restart: null,
    };
    const send = (s: Omit<Signal, "gen">) =>
      h.sendSignal(id, { gen: p.gen, ...s } satisfies Signal);
    pc.onicecandidate = (e) => {
      if (e.candidate) send({ candidate: e.candidate.toJSON() });
    };
    pc.onnegotiationneeded = async () => {
      if (!isInitiator(me, id)) return;
      try {
        await pc.setLocalDescription();
        send({ sdp: pc.localDescription!.toJSON() });
      } catch {
        // a connection closed under us
      }
    };
    dc.onopen = () => setState(p, "open");
    dc.onclose = () => setState(p, peers.get(id) === p ? "reconnecting" : "closed");
    dc.onmessage = (e) => {
      try {
        h.onWire(id, JSON.parse(String(e.data)) as Wire);
      } catch {
        // a message that is not ours
      }
    };
    pc.oniceconnectionstatechange = () => {
      const s = pc.iceConnectionState;
      if (p.restart) clearTimeout(p.restart);
      p.restart = null;
      if (s === "connected" || s === "completed") {
        if (dc.readyState === "open") setState(p, "open");
      } else if (s === "failed" || s === "disconnected") {
        setState(p, "reconnecting");
        if (isInitiator(me, id))
          p.restart = setTimeout(() => pc.restartIce(), s === "failed" ? 0 : RESTART_AFTER_MS);
      }
    };
    // a fresh answering side asks the offering side to (re)start
    if (!isInitiator(me, id)) send({ hi: true });
    return p;
  };

  const drop = (p: Peer) => {
    if (p.restart) clearTimeout(p.restart);
    p.pc.onicecandidate = p.pc.onnegotiationneeded = p.pc.oniceconnectionstatechange = null;
    p.dc.onopen = p.dc.onclose = p.dc.onmessage = null;
    p.pc.close();
  };

  /** a new connection in place of a stale one, same state as far as the session knows */
  const rebuild = (old: Peer): Peer => {
    drop(old);
    const p = build(old.id);
    peers.set(old.id, p);
    return p;
  };

  const handle = async (from: string, s: Signal) => {
    let p = peers.get(from);
    if (!p) return;
    if (s.hi) {
      // the answering side is a new instance: the offering side starts over
      if (p.remoteGen && p.remoteGen !== s.gen && isInitiator(me, from)) p = rebuild(p);
      p.remoteGen = s.gen;
      return;
    }
    if (p.remoteGen && p.remoteGen !== s.gen) p = rebuild(p);
    p.remoteGen = s.gen;
    const { pc } = p;
    try {
      if (s.sdp) {
        await pc.setRemoteDescription(s.sdp);
        for (const c of p.early.splice(0)) await pc.addIceCandidate(c);
        if (s.sdp.type === "offer") {
          await pc.setLocalDescription();
          h.sendSignal(from, { gen: p.gen, sdp: pc.localDescription!.toJSON() } satisfies Signal);
        }
      } else if (s.candidate) {
        if (pc.remoteDescription) await pc.addIceCandidate(s.candidate);
        else p.early.push(s.candidate);
      }
    } catch {
      // setup for a connection we have already replaced
    }
  };

  return {
    setPeers(ids) {
      for (const [id, p] of peers)
        if (!ids.includes(id)) {
          peers.delete(id);
          drop(p);
          h.onState(id, "closed");
        }
      for (const id of ids) {
        if (peers.has(id)) continue;
        peers.set(id, build(id));
        for (const s of waiting.get(id)?.splice(0) ?? []) void handle(id, s);
      }
    },
    signal(from, data) {
      const s = data as Signal;
      if (peers.has(from)) void handle(from, s);
      else waiting.set(from, [...(waiting.get(from) ?? []).slice(-20), s]);
    },
    send(to, w) {
      const p = peers.get(to);
      if (!p || p.dc.readyState !== "open") return false;
      p.dc.send(JSON.stringify(w));
      return true;
    },
    broadcast(w) {
      for (const id of peers.keys()) this.send(id, w);
    },
    close() {
      for (const p of peers.values()) drop(p);
      peers.clear();
    },
  };
}
