import type { GameEvent, GameState, InstId } from "../engine/types";
import type { Bounds } from "./layout";

/** camera centre (world x/z) and zoom (screen px per world unit) */
export interface Cam {
  cx: number;
  cz: number;
  zoom: number;
}

export interface View {
  w: number;
  h: number;
}

/** screen space (px) covered by fixed HUD panels: focus and "whole map" aim at the free area between them */
export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

/** a location is shown at this many px tall by default (at 1080p, scaled with the window height) */
export const FOCUS_PX = 420;
/** the closest zoom shows a location this many px tall */
export const MAX_LOC_PX = 840;

/** default zoom: a location FOCUS_PX tall at 1080p, scaled with the window height */
export const focusZoom = (view: View, locH: number) => (FOCUS_PX * (view.h / 1080)) / locH;

/**
 * Far end: the whole map fits the window (and never less than half the default size, so a one-room map can still zoom out);
 * near end: a location MAX_LOC_PX tall.
 */
export function zoomLimits(bounds: Bounds, view: View, locH: number, insets: Insets = NO_INSETS): { min: number; max: number } {
  // "whole map" fits the free area between the HUD panels, so that zoom must be reachable
  const fit = fitCam(bounds, view, insets).zoom;
  const min = Math.min(fit, focusZoom(view, locH) / 2);
  return { min, max: Math.max(min, MAX_LOC_PX / locH) };
}

/** at least this much of the map (px, or half the map if it is smaller) stays inside the free area; more than the act/agenda panel is wide */
const KEEP_PX = 320;

/** keep the zoom within its limits and the map visible in the free area (never hidden under the HUD panels) */
export function clampCam(c: Cam, bounds: Bounds, view: View, locH: number, insets: Insets = NO_INSETS): Cam {
  const { min, max } = zoomLimits(bounds, view, locH, insets);
  const zoom = Math.min(max, Math.max(min, c.zoom));
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  // free area edges relative to the camera centre, in world units
  const left = (insets.left - view.w / 2) / zoom;
  const right = (view.w / 2 - insets.right) / zoom;
  const top = (insets.top - view.h / 2) / zoom;
  const bottom = (view.h / 2 - insets.bottom) / zoom;
  const kx = Math.min(KEEP_PX / zoom, (bounds.x1 - bounds.x0) / 2);
  const kz = Math.min(KEEP_PX / zoom, (bounds.z1 - bounds.z0) / 2);
  return {
    zoom,
    // the map's right edge stays kx past the free area's left edge, its left edge kx before the right edge (same for z)
    cx: clamp(c.cx, bounds.x0 + kx - right, bounds.x1 - kx - left),
    cz: clamp(c.cz, bounds.z0 + kz - bottom, bounds.z1 - kz - top),
  };
}

/** zoom by `factor` keeping the world point under the screen point (px, py) fixed */
export function zoomAt(c: Cam, factor: number, px: number, py: number, view: View): Cam {
  const dx = px - view.w / 2;
  const dy = py - view.h / 2;
  const wx = c.cx + dx / c.zoom;
  const wz = c.cz + dy / c.zoom;
  const zoom = c.zoom * factor;
  return { zoom, cx: wx - dx / zoom, cz: wz - dy / zoom };
}

/** move the camera so the screen drags by (dx, dy) px */
export const panBy = (c: Cam, dx: number, dy: number): Cam => ({ ...c, cx: c.cx - dx / c.zoom, cz: c.cz - dy / c.zoom });

/** centre a point in the free area between the HUD insets */
function centreIn(x: number, z: number, zoom: number, view: View, insets: Insets): Cam {
  const offX = (insets.left - insets.right) / 2;
  const offY = (insets.top - insets.bottom) / 2;
  return { zoom, cx: x - offX / zoom, cz: z - offY / zoom };
}

/** default view: a location about FOCUS_PX tall (scaled to the window height), centred in the free area */
export function focusCam(x: number, z: number, locH: number, view: View, insets: Insets): Cam {
  return centreIn(x, z, focusZoom(view, locH), view, insets);
}

/** the whole map inside the free area */
export function fitCam(bounds: Bounds, view: View, insets: Insets): Cam {
  const w = Math.max(100, view.w - insets.left - insets.right);
  const h = Math.max(100, view.h - insets.top - insets.bottom);
  const zoom = Math.min(w / (bounds.x1 - bounds.x0), h / (bounds.z1 - bounds.z0));
  return centreIn((bounds.x0 + bounds.x1) / 2, (bounds.z0 + bounds.z1) / 2, zoom, view, insets);
}

/**
 * The location the camera looks at while an event plays, or null to stay on the deciding investigator: where a card
 * spawns, where the enemy is (a moving enemy: where it goes), the location itself, or the investigator's location.
 */
export function eventFocus(e: GameEvent | null, game: GameState): InstId | null {
  if (!e) return null;
  const isLoc = (id: unknown): id is InstId => typeof id === "string" && game.cards[id]?.zone === "location";
  if (e.type === "spawn" && isLoc(e.data?.at)) return e.data.at;
  const c = e.card ? game.cards[e.card] : null;
  if (c?.zone === "enemy" && isLoc(c.location)) return c.location;
  if (c?.zone === "location") return c.id;
  const at = e.inv ? game.invs[e.inv]?.location : null;
  return isLoc(at) ? at : null;
}
