/** The browser's side of the room server: a WebSocket that says hello again whenever it reconnects. */
import type { DeckDef } from "../content/schema";
import { PROTOCOL, type FromRoom } from "./protocol";
import type { Link, LinkHandlers } from "./transport";

export const roomSocketUrl = (loc: { protocol: string; host: string }, room: string): string =>
  `${loc.protocol === "https:" ? "wss:" : "ws:"}//${loc.host}/net/room/${room}`;

const MIN_WAIT = 500;
const MAX_WAIT = 15_000;

export interface SocketOptions {
  WebSocketImpl?: typeof WebSocket;
  random?: () => number;
}

/** open the socket and keep it open: after a drop it comes back after 0.5 s, 1 s, 2 s … up to 15 s, with some jitter */
export function socketLink(url: string, h: LinkHandlers, opts: SocketOptions = {}): Link {
  const Impl = opts.WebSocketImpl ?? WebSocket;
  const random = opts.random ?? Math.random;
  let socket: WebSocket | null = null;
  let wait = MIN_WAIT;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;

  const connect = () => {
    h.onState("connecting");
    const s = new Impl(url);
    socket = s;
    s.onopen = () => {
      wait = MIN_WAIT;
      h.onState("open");
    };
    s.onmessage = (e) => {
      try {
        h.onMessage(JSON.parse(String(e.data)) as FromRoom<DeckDef>);
      } catch {
        // a message that is not ours
      }
    };
    s.onclose = () => {
      if (socket !== s) return;
      h.onState("closed");
      if (closed) return;
      timer = setTimeout(connect, wait * (1 + random() * 0.25));
      wait = Math.min(wait * 2, MAX_WAIT);
    };
  };
  connect();

  return {
    send(m) {
      if (socket?.readyState === 1) socket.send(JSON.stringify(m));
    },
    close() {
      closed = true;
      if (timer) clearTimeout(timer);
      socket?.close();
    },
  };
}

/** whether this site has a room server that speaks this protocol (online play is offered only then) */
export async function roomAvailable(doFetch: typeof fetch = fetch): Promise<boolean> {
  try {
    const res = await doFetch("/net/health", { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return false;
    const body = (await res.json()) as { ok?: boolean; protocol?: number };
    return body.ok === true && body.protocol === PROTOCOL;
  } catch {
    return false;
  }
}
