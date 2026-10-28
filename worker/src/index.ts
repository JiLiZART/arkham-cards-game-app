/**
 * The site's Worker (ADR-0019): under /net/ the room sockets, TURN credentials and a health check; under /cards/ the
 * card scans, fetched from the arkham.build CDN (it sends no CORS headers, and WebGL needs them same-origin). Every
 * other path is a file of the build, served from the static assets before this Worker runs.
 */
import { PROTOCOL } from "../../src/net/protocol";
import { iceServers, type TurnEnv } from "./turn";

export { Room } from "./do";

export interface Env extends TurnEnv {
  ROOMS: DurableObjectNamespace;
  /** the built site (dist/) */
  ASSETS: Fetcher;
  /** the deployed build, answered by /net/health */
  APP_VERSION: string;
}

const ROOM_ID = /^[A-Za-z0-9_-]{16,64}$/;
const CARD_CDN = "https://cdn.arkham.build/optimized";
/** a scan's file name, so /cards/ can't be used to fetch anything else from the CDN */
const CARD_FILE = /^\/cards\/[A-Za-z0-9_-]+\.(webp|avif|jpe?g|png)$/;
/** scans never change under a name: a month in the browser and at the edge */
const CARD_TTL = 30 * 24 * 3600;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/cards/")) {
      if (!CARD_FILE.test(url.pathname)) return json({ error: "not found" }, 404);
      const scan = await fetch(CARD_CDN + url.pathname.slice("/cards".length), {
        cf: { cacheEverything: true, cacheTtl: CARD_TTL },
      });
      const res = new Response(scan.body, scan);
      if (scan.ok) res.headers.set("cache-control", `public, max-age=${CARD_TTL}, immutable`);
      return res;
    }
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
