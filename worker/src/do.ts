/**
 * One Durable Object per room (ADR-0019). It keeps the roster, relays connection setup between the players' sockets,
 * and broadcasts changes. The rules are in room.ts; this file only stores, sockets and sends. It never sees a move.
 */
import { DurableObject } from "cloudflare:workers";
import {
  playerId,
  PROTOCOL,
  type FromRoom,
  type Roster,
  type ToRoom,
} from "../../src/net/protocol";
import {
  claim,
  emptyRoom,
  hello,
  leave,
  noteHave,
  openOn,
  release,
  releaseAway,
  rename,
  setLobby,
  start,
  type Step,
} from "./room";
import type { Env } from "./index";

interface Attachment {
  id: string;
}

export class Room extends DurableObject<Env> {
  private async load(): Promise<Roster> {
    return (await this.ctx.storage.get<Roster>("roster")) ?? emptyRoom();
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname.endsWith("/exists")) {
      const r = await this.load();
      return new Response(null, { status: Object.keys(r.players).length ? 204 : 404 });
    }
    if (req.headers.get("Upgrade") !== "websocket")
      return new Response("expected a websocket", { status: 426 });
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  private send(ws: WebSocket, msg: FromRoom) {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      // a socket that is closing; its close handler cleans up
    }
  }

  /** the open socket of a player, apart from `except` (a socket that is closing still shows in the list) */
  private socketOf(id: string, except?: WebSocket): WebSocket | undefined {
    return this.ctx
      .getWebSockets()
      .find((w) => w !== except && (w.deserializeAttachment() as Attachment | null)?.id === id);
  }

  private async commit(step: Step, ws: WebSocket) {
    if (step.error) return this.send(ws, { t: "error", key: step.error });
    await this.ctx.storage.put("roster", step.room);
    for (const w of this.ctx.getWebSockets())
      if ((w.deserializeAttachment() as Attachment | null)?.id)
        this.send(w, { t: "roster", roster: step.room });
  }

  async webSocketMessage(ws: WebSocket, data: string | ArrayBuffer): Promise<void> {
    if (typeof data !== "string") return;
    let msg: ToRoom;
    try {
      msg = JSON.parse(data) as ToRoom;
    } catch {
      return this.send(ws, { t: "error", key: "net.error.unknown" });
    }
    const now = Date.now();
    const roster = await this.load();

    if (msg.t === "hello") {
      const id = await playerId(msg.key);
      const step = hello(roster, {
        id,
        name: msg.name.slice(0, 40),
        app: msg.app,
        engine: msg.engine,
        protocol: msg.protocol ?? PROTOCOL,
        have: msg.have,
        now,
      });
      if (step.error) return this.send(ws, { t: "error", key: step.error });
      // the same player in a newer tab or after a crash: the old socket goes
      const old = this.socketOf(id);
      if (old && old !== ws) {
        old.serializeAttachment(null);
        old.close(4000, "replaced");
      }
      ws.serializeAttachment({ id } satisfies Attachment);
      // the welcome comes first: it says who you are, the roster broadcast after it is for everyone
      this.send(ws, { t: "welcome", you: id, roster: step.room });
      return this.commit(step, ws);
    }

    const id = (ws.deserializeAttachment() as Attachment | null)?.id;
    if (!id) return this.send(ws, { t: "error", key: "net.error.unknown" });
    switch (msg.t) {
      case "lobby":
        return this.commit(setLobby(roster, id, msg.lobby), ws);
      case "claim":
        return this.commit(claim(roster, id, { inv: msg.inv, pick: msg.pick }), ws);
      case "release":
        return this.commit(release(roster, id, msg.inv), ws);
      case "releaseAway":
        return this.commit(releaseAway(roster, id, msg.id, now), ws);
      case "start":
        return this.commit(start(roster, id), ws);
      case "open":
        return this.commit(openOn(roster, id, msg.invs), ws);
      case "have":
        return this.commit(noteHave(roster, id, msg.n), ws);
      case "rename":
        return this.commit(rename(roster, id, msg.name.slice(0, 40)), ws);
      case "signal": {
        const to = this.socketOf(msg.to);
        if (to) this.send(to, { t: "signal", from: id, data: msg.data });
        return;
      }
      // a player's message for another while no peer connection is open: passed on unread, the sender stamped from
      // the socket, never from the message (ADR-0020)
      case "relay": {
        const to = typeof msg.to === "string" ? this.socketOf(msg.to) : null;
        if (to) this.send(to, { t: "relay", from: id, w: msg.w });
        return;
      }
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const id = (ws.deserializeAttachment() as Attachment | null)?.id;
    if (!id || this.socketOf(id, ws)) return; // replaced by a newer socket of the same player
    await this.commit(leave(await this.load(), id, Date.now()), ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.webSocketClose(ws);
  }
}
