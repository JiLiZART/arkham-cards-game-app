import { useEffect, useState, useSyncExternalStore } from "react";
import type { Insets } from "./camera";

/**
 * The one layout switch (ADR-0005): components read the mode, CSS hangs off `.game.phone`, and geometry (the camera's
 * insets, the fan's sizes, the overlays) is keyed by it. No component has its own media query.
 */
export type LayoutMode = "desktop" | "phone";

/** a phone held sideways (500 px tall or less, or 900 px wide or less), or held upright (500 px wide or less: the rotate card) */
export function layoutModeOf(
  width: number,
  height: number,
): { mode: LayoutMode; portrait: boolean } {
  const portrait = height > width;
  const phone = portrait ? width <= 500 : height <= 500 || width <= 900;
  return { mode: phone ? "phone" : "desktop", portrait };
}

export const viewportOf = (w: { innerWidth: number; innerHeight: number }) => ({
  width: w.innerWidth,
  height: w.innerHeight,
});

/** screen space (px) covered by fixed HUD around the map on the desktop; the camera centres things in what's left */
export const DESKTOP_INSETS: Insets = { top: 86, right: 470, bottom: 170, left: 200 };
/** on the phone: the 36 px bar, the strip's thumbnail column on the right, and the hand drawer's peek with the instruction bar above it */
export const PHONE_INSETS: Insets = { top: 36, right: 56, bottom: 136, left: 0 };

/** the camera's insets for a mode; on the phone the notch and home-indicator areas are added */
export function insetsFor(
  mode: LayoutMode,
  safe: Insets = { top: 0, right: 0, bottom: 0, left: 0 },
): Insets {
  if (mode === "desktop") return DESKTOP_INSETS;
  return {
    top: PHONE_INSETS.top + safe.top,
    right: PHONE_INSETS.right + safe.right,
    bottom: PHONE_INSETS.bottom + safe.bottom,
    left: PHONE_INSETS.left + safe.left,
  };
}

// ---------- live values ----------
let probe: HTMLDivElement | null = null;
/** the safe-area insets the browser reports (env(safe-area-inset-*)), measured on a hidden element */
export function safeAreaInsets(): Insets {
  if (typeof document === "undefined") return { top: 0, right: 0, bottom: 0, left: 0 };
  if (!probe) {
    probe = document.createElement("div");
    probe.style.cssText =
      "position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)";
    document.body.appendChild(probe);
  }
  const s = getComputedStyle(probe);
  return {
    top: parseFloat(s.paddingTop) || 0,
    right: parseFloat(s.paddingRight) || 0,
    bottom: parseFloat(s.paddingBottom) || 0,
    left: parseFloat(s.paddingLeft) || 0,
  };
}

const subscribe = (on: () => void) => {
  window.addEventListener("resize", on);
  window.addEventListener("orientationchange", on);
  return () => {
    window.removeEventListener("resize", on);
    window.removeEventListener("orientationchange", on);
  };
};
// a string snapshot keeps useSyncExternalStore stable between resizes that don't change the mode
const snapshot = () => {
  const { width, height } = viewportOf(window);
  const m = layoutModeOf(width, height);
  return `${m.mode}:${m.portrait ? 1 : 0}`;
};

/** the layout mode and orientation, updated on resize and rotation */
export function useLayout(): { mode: LayoutMode; portrait: boolean } {
  const s = useSyncExternalStore(subscribe, snapshot, () => "desktop:0");
  const [mode, portrait] = s.split(":");
  return { mode: mode as LayoutMode, portrait: portrait === "1" };
}

export const useLayoutMode = (): LayoutMode => useLayout().mode;

/** the current mode, outside React */
export const layoutModeNow = (): LayoutMode =>
  typeof window === "undefined"
    ? "desktop"
    : layoutModeOf(window.innerWidth, window.innerHeight).mode;

/** the window's size, updated as it changes */
export function useViewport(): { width: number; height: number } {
  const [v, setV] = useState(() => viewportOf(window));
  useEffect(() => {
    const on = () => setV(viewportOf(window));
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return v;
}
