/**
 * The net Worker (ADR-0019): on the site's own origin under /net/ it serves the room sockets, TURN credentials and a
 * health check. Everything else is the site's, served by whatever hosts it.
 */
import { PROTOCOL } from "../../src/net/protocol";
import { iceServers, type TurnEnv } from "./turn";

export { Room } from "./do";

export interface Env extends TurnEnv {
  ROOMS: DurableObjectNamespace;
  /** the deployed build, answered by /net/health */
  APP_VERSION: string;
}

const ROOM_ID = /^[A-Za-z0-9_-]{16,64}$/;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === "/net/health")
      return json({ ok: true, version: env.APP_VERSION, protocol: PROTOCOL });

    const socket = url.pathname.match(/^\/net\/room\/([^/]+)$/);
    if (socket) {
      if (!ROOM_ID.test(socket[1])) return json({ error: "bad room" }, 400);
      return env.ROOMS.get(env.ROOMS.idFromName(socket[1])).fetch(req);
    }

    if (url.pathname === "/net/turn") {
      const room = url.searchParams.get("room") ?? "";
      if (!ROOM_ID.test(room)) return json({ error: "bad room" }, 400);
      // credentials only for rooms that exist, so the endpoint can't be farmed
      const known = await env.ROOMS.get(env.ROOMS.idFromName(room)).fetch("https://room/exists");
      if (known.status !== 204) return json({ error: "unknown room" }, 404);
      return json(await iceServers(env));
    }

    return json({ error: "not found" }, 404);
  },
} satisfies ExportedHandler<Env>;
