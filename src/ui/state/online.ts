/** The online room this browser is in, if any: the controller between the screens and the net session (ADR-0018). */
import { useStore } from "zustand";
import { create } from "zustand";
import { createStore } from "zustand/vanilla";
import { hashFor, newRoomId } from "../../net/link";
import { openRoom } from "../../net/connect";
import { randomToken } from "../../net/protocol";
import type { NetState, Session } from "../../net/session";
import { roomAvailable } from "../../net/signaling";
import { gameStore } from "./context";
import { SAVE_KEY, safeStorage } from "./store";

const NAME_KEY = "ah:net:name";
const keyOf = (room: string) => `ah:net:key:${room}`;
/** the save that was on this device before a room replaced it */
export const BACKUP_KEY = "ah:save:before-online";

interface OnlineState {
  /** the site has a room server that answers; null until asked */
  available: boolean | null;
  session: Session | null;
}

export const useOnline = create<OnlineState>(() => ({ available: null, session: null }));

export async function checkOnline(): Promise<void> {
  if (useOnline.getState().available !== null) return;
  useOnline.setState({ available: await roomAvailable() });
}

/** the name shown to the others: the player's own, else one made up and kept, so two newcomers differ */
export function playerName(): string {
  try {
    const known = localStorage.getItem(NAME_KEY);
    if (known) return known;
    const made = `Player ${1000 + Math.floor(Math.random() * 9000)}`;
    localStorage.setItem(NAME_KEY, made);
    return made;
  } catch {
    return "Player";
  }
}

export function setPlayerName(name: string): void {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    // no storage: the name is asked again next time
  }
  useOnline.getState().session?.rename(name);
}

/** this browser's secret for a room: kept so that coming back to the link is coming back as the same player */
function keyFor(room: string): string {
  const saved = gameStore.getState().room;
  if (saved?.id === room) return saved.playerKey;
  try {
    const known = localStorage.getItem(keyOf(room));
    if (known) return known;
    const key = randomToken(16);
    localStorage.setItem(keyOf(room), key);
    return key;
  } catch {
    return randomToken(16);
  }
}

const setHash = (hash: string) =>
  history.replaceState(null, "", `${location.pathname}${location.search}${hash}`);

async function begin(room: string, fresh: boolean, onJoined?: (s: Session) => void) {
  leaveRoom();
  const key = keyFor(room);
  try {
    localStorage.setItem(keyOf(room), key);
  } catch {
    // see keyFor
  }
  // a game here that isn't the room's is set aside, not lost
  if (fresh) {
    const raw = safeStorage().getItem(SAVE_KEY);
    if (raw && gameStore.getState().room?.id !== room) safeStorage().setItem(BACKUP_KEY, raw);
  }
  const session = openRoom(gameStore, room, key, playerName());
  useOnline.setState({ session });
  setHash(hashFor(room));
  if (onJoined) {
    const stop = session.net.subscribe((s) => {
      if (s.phase !== "joined") return;
      stop();
      onJoined(session);
    });
  }
  await session.start();
  if (!gameStore.getState().game || fresh) gameStore.setState({ screen: "lobby" });
}

/** a new room; with `saved`, on the campaign saved here */
export function createRoom(opts: { saved: boolean }) {
  return begin(newRoomId(), !opts.saved, opts.saved ? (s) => s.openOnSaved() : undefined);
}

/** the room of a link (or of this browser's save): coming back to it, or joining it new */
export function joinRoom(room: string) {
  return begin(room, gameStore.getState().room?.id !== room);
}

export function leaveRoom(): void {
  const session = useOnline.getState().session;
  if (!session) return;
  session.leave();
  useOnline.setState({ session: null });
  setHash("");
}

/** the room's link onto the clipboard; false where the browser won't (no clipboard, or not allowed) */
export async function copyLink(): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(location.href);
    return true;
  } catch {
    return false;
  }
}

/** the saved game's room, offered on the title screen */
export const savedRoom = (): string | null => gameStore.getState().room?.id ?? null;

const idle = createStore<NetState>(() => ({
  phase: "closed",
  online: false,
  me: null,
  roster: null,
  peers: {},
  relay: null,
  busy: false,
  notice: null,
}));

/** the session's state, or a closed one without a room */
export function useNet<T>(select: (s: NetState) => T): T {
  const session = useOnline((s) => s.session);
  return useStore(session?.net ?? idle, select);
}
