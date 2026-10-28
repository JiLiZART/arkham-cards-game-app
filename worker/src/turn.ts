/** The ICE servers a browser connects with: public STUN first, then Cloudflare TURN with short-lived credentials. */

export interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export const PUBLIC_STUN: IceServer[] = [
  { urls: "stun:stun.cloudflare.com:3478" },
  { urls: "stun:stun.l.google.com:19302" },
];

/** how long the credentials last: a long evening of play */
const TTL_SECONDS = 6 * 60 * 60;

export interface TurnEnv {
  TURN_KEY_ID?: string;
  TURN_KEY_TOKEN?: string;
}

/** `relay` says whether TURN servers are among them; without, some networks will fail to connect */
export async function iceServers(
  env: TurnEnv,
  doFetch: typeof fetch = fetch,
): Promise<{ iceServers: IceServer[]; relay: boolean }> {
  const stunOnly = { iceServers: PUBLIC_STUN, relay: false };
  if (!env.TURN_KEY_ID || !env.TURN_KEY_TOKEN) return stunOnly;
  try {
    const res = await doFetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate-ice-servers`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${env.TURN_KEY_TOKEN}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ ttl: TTL_SECONDS }),
      },
    );
    if (!res.ok) return stunOnly;
    const body = (await res.json()) as { iceServers?: IceServer[] };
    // Cloudflare's own list repeats its STUN; ours already comes first
    const relays = (body.iceServers ?? []).filter((s) => s.username && s.credential);
    return relays.length ? { iceServers: [...PUBLIC_STUN, ...relays], relay: true } : stunOnly;
  } catch {
    return stunOnly;
  }
}
