/** The real pipes for a session: a WebSocket to the room server, WebRTC between players, and /net/turn for relays. */
import type { StoreApi } from "zustand";
import { APP_VERSION, type UiState } from "../ui/state/store";
import { createMesh } from "./mesh";
import { socketLink, roomSocketUrl } from "./signaling";
import { Session } from "./session";
import type { IceConfig } from "./transport";
import { useView } from "../ui/state/view";

/** public STUN only: what a browser can use when the room server can't mint relays */
const STUN_ONLY: IceConfig = {
  iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }, { urls: "stun:stun.l.google.com:19302" }],
  relay: false,
};

async function fetchIce(room: string): Promise<IceConfig> {
  try {
    const res = await fetch(`/net/turn?room=${encodeURIComponent(room)}`);
    if (!res.ok) return STUN_ONLY;
    return (await res.json()) as IceConfig;
  } catch {
    return STUN_ONLY;
  }
}

/** a session in `roomId` for this browser; `key` is its secret for the room */
export function openRoom(
  store: StoreApi<UiState>,
  roomId: string,
  key: string,
  name: string,
): Session {
  return new Session({
    store,
    setMySeats: (seats) => useView.getState().setMySeats(seats),
    link: (h) => socketLink(roomSocketUrl(location, roomId), h),
    mesh: (me, ice, h) => createMesh(me, ice, h),
    ice: fetchIce,
    roomId,
    key,
    name,
    app: APP_VERSION,
  });
}
