import { useSyncExternalStore } from "react";

/** the slice of an element the helper uses (WebKit's prefixed form included), so it can be tested without a DOM */
export interface FullscreenEl {
  requestFullscreen?: () => Promise<void>;
  webkitRequestFullscreen?: () => void | Promise<void>;
}

/** the slice of `document` the helper uses */
export interface FullscreenDoc {
  fullscreenEnabled?: boolean;
  webkitFullscreenEnabled?: boolean;
  fullscreenElement?: unknown;
  webkitFullscreenElement?: unknown;
  exitFullscreen?: () => Promise<void>;
  webkitExitFullscreen?: () => void | Promise<void>;
  documentElement: FullscreenEl;
}

/** local-storage key of the one-time ask: present once it was answered on this device */
export const ASKED_KEY = "fullscreen-asked";

/** whether the page can go fullscreen: absent on iPhone Safari, where no toggle is shown */
export function fullscreenSupported(d: FullscreenDoc = document): boolean {
  const enabled = d.fullscreenEnabled ?? d.webkitFullscreenEnabled;
  const el = d.documentElement;
  return enabled !== false && !!(el.requestFullscreen || el.webkitRequestFullscreen);
}

export function fullscreenActive(d: FullscreenDoc = document): boolean {
  return !!(d.fullscreenElement ?? d.webkitFullscreenElement);
}

/** enter fullscreen on the whole page, or leave it; false when the browser refused (no gesture, a policy) */
export async function toggleFullscreen(d: FullscreenDoc = document): Promise<boolean> {
  try {
    if (fullscreenActive(d)) {
      await (d.exitFullscreen ?? d.webkitExitFullscreen)?.call(d);
    } else {
      const el = d.documentElement;
      await (el.requestFullscreen ?? el.webkitRequestFullscreen)?.call(el);
    }
    return true;
  } catch {
    return false;
  }
}

const subscribe = (on: () => void) => {
  document.addEventListener("fullscreenchange", on);
  document.addEventListener("webkitfullscreenchange", on);
  return () => {
    document.removeEventListener("fullscreenchange", on);
    document.removeEventListener("webkitfullscreenchange", on);
  };
};

/** whether the page is in fullscreen now, updated when the browser enters or leaves it (also by its own gesture) */
export const useFullscreen = (): boolean =>
  useSyncExternalStore(
    subscribe,
    () => fullscreenActive(),
    () => false,
  );

/** which line the one-time ask shows: the fullscreen question, the Add to Home Screen hint, or nothing */
export function askKind(s: {
  phone: boolean;
  supported: boolean;
  asked: boolean;
  active?: boolean;
}): "fullscreen" | "homeScreen" | null {
  if (!s.phone || s.asked || s.active) return null;
  return s.supported ? "fullscreen" : "homeScreen";
}
