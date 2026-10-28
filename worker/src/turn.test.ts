import { describe, expect, it } from "vitest";
import { iceServers, PUBLIC_STUN } from "./turn";

const creds = {
  iceServers: [{ urls: ["turn:turn.cloudflare.com:3478"], username: "u", credential: "c" }],
};
const fetchOk = (async () => new Response(JSON.stringify(creds), { status: 201 })) as typeof fetch;
const fetchBad = (async () => new Response("no", { status: 500 })) as typeof fetch;
const fetchThrows = (async () => {
  throw new Error("offline");
}) as typeof fetch;
const env = { TURN_KEY_ID: "id", TURN_KEY_TOKEN: "token" };

describe("iceServers", () => {
  it("lists public STUN first, then the relays with their credentials", async () => {
    const r = await iceServers(env, fetchOk);
    expect(r.relay).toBe(true);
    expect(r.iceServers.slice(0, PUBLIC_STUN.length)).toEqual(PUBLIC_STUN);
    expect(r.iceServers.at(-1)).toEqual(creds.iceServers[0]);
  });

  it("asks Cloudflare with the key and a lifetime of hours", async () => {
    let seen: { url: string; init?: RequestInit } | undefined;
    await iceServers(env, (async (url: string, init?: RequestInit) => {
      seen = { url, init };
      return new Response(JSON.stringify(creds), { status: 201 });
    }) as unknown as typeof fetch);
    expect(seen!.url).toContain("/turn/keys/id/credentials/generate-ice-servers");
    expect((seen!.init!.headers as Record<string, string>).authorization).toBe("Bearer token");
    expect(JSON.parse(seen!.init!.body as string).ttl).toBeGreaterThanOrEqual(3600);
  });

  it("falls back to STUN only when Cloudflare refuses", async () => {
    expect(await iceServers(env, fetchBad)).toEqual({ iceServers: PUBLIC_STUN, relay: false });
  });

  it("falls back to STUN only when the request fails", async () => {
    expect(await iceServers(env, fetchThrows)).toEqual({ iceServers: PUBLIC_STUN, relay: false });
  });

  it("falls back to STUN only when no key is configured", async () => {
    expect(await iceServers({}, fetchOk)).toEqual({ iceServers: PUBLIC_STUN, relay: false });
  });
});
