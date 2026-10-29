/** The real pipes for a session: a WebSocket to the room server, WebRTC between players, and /net/turn for relays. */
import type { StoreApi } from "zustand";
import { APP_VERSION, type UiState } from "../ui/state/store";
import { createMesh } from "./mesh";
import { socketLink, roomSocketUrl } from "./signaling";
import { Session } from "./session";
import type { IceConfig } from "./transport";
import { sharedView } from "../ui/game/sharedView";
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
    onShow: (from, view) => {
      const game = store.getState().game;
      if (game && sharedView(game, view)) useView.getState().showFrom(from, view);
    },
    // a view this player opened (not one shown to them) that the whole table may see
    watchViews: (send) =>
      useView.subscribe((s, prev) => {
        const game = store.getState().game;
        if (s.modal !== prev.modal && !s.shownBy && game && sharedView(game, s.modal))
          send(s.modal);
      }),
    link: (h) => socketLink(roomSocketUrl(location, roomId), h),
    mesh: (me, ice, h) => createMesh(me, ice, h),
    ice: fetchIce,
    roomId,
    key,
    name,
    app: APP_VERSION,
  });
}
