import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { reducedMotion } from "../arrivals";
import { clampCam, fitCam, focusCam, panBy, zoomAt, type Cam } from "../camera";
import type { Bounds, Vec3 } from "../layout";
import { HUD_INSETS } from "../safeArea";
import { useView } from "../view";

/** pointer state shared with the scene: a press that panned must not count as a click */
export const camInput = { panned: false, last: 0 };
const PAN_THRESHOLD = 5;
/** the camera doesn't re-centre on its own this soon after the player panned or zoomed */
const QUIET_MS = 1500;

/**
 * Top-down orthographic map camera: drag to pan, wheel / pinch to zoom around the pointer, eased toward a target.
 * The target follows the deciding investigator's location (`focus`) unless the player recently moved the view.
 */
export function MapCamera({ bounds, locH, focus, focusKey }: { bounds: Bounds; locH: number; focus: Vec3 | null; focusKey: string }) {
  const camera = useThree((s) => s.camera) as THREE.OrthographicCamera;
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);
  const view = { w: size.width, h: size.height };
  const viewRef = useRef(view);
  viewRef.current = view;
  const geo = useRef({ bounds, locH });
  geo.current = { bounds, locH };
  const home = (): Cam => (focus ? focusCam(focus[0], focus[2], locH, viewRef.current, HUD_INSETS) : fitCam(bounds, viewRef.current, HUD_INSETS));
  const clamp = (c: Cam) => clampCam(c, geo.current.bounds, viewRef.current, geo.current.locH, HUD_INSETS);
  const cur = useRef<Cam | null>(null);
  const target = useRef<Cam>(home());
  if (!cur.current) cur.current = clamp(target.current);

  // follow the decision: a new decider or a move re-centres, unless the player is looking around
  const focusRef = useRef(home);
  focusRef.current = home;
  useEffect(() => {
    if (Date.now() - camInput.last < QUIET_MS || useView.getState().moveDrag) return;
    target.current = focusRef.current();
  }, [focusKey]);

  // "Focus" / "Whole map" buttons
  const cmd = useView((s) => s.camCmd);
  useEffect(() => {
    if (!cmd) return;
    target.current = cmd.kind === "focus" ? focusRef.current() : fitCam(geo.current.bounds, viewRef.current, HUD_INSETS);
  }, [cmd]);

  useEffect(() => {
    const el = gl.domElement;
    const pointers = new Map<number, { x: number; y: number }>();
    let start: { x: number; y: number } | null = null;
    let pinch = 0;
    const local = (e: { clientX: number; clientY: number }) => {
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const set = (c: Cam) => {
      const k = clamp(c);
      target.current = k;
      cur.current = k;
      camInput.last = Date.now();
    };
    const down = (e: PointerEvent) => {
      if (e.button !== 0 && e.button !== 1) return;
      pointers.set(e.pointerId, local(e));
      camInput.panned = false;
      start = local(e);
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = Math.hypot(a.x - b.x, a.y - b.y);
      }
    };
    const move = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      const p = local(e);
      pointers.set(e.pointerId, p);
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch > 0) set(zoomAt(cur.current!, d / pinch, (a.x + b.x) / 2, (a.y + b.y) / 2, viewRef.current));
        pinch = d;
        camInput.panned = true;
        return;
      }
      if (!camInput.panned && start && Math.hypot(p.x - start.x, p.y - start.y) < PAN_THRESHOLD) return;
      camInput.panned = true;
      set(panBy(cur.current!, p.x - prev.x, p.y - prev.y));
    };
    const up = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = 0;
      if (!pointers.size) start = null;
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = local(e);
      set(zoomAt(cur.current!, Math.exp(-e.deltaY * 0.0015), p.x, p.y, viewRef.current));
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      el.removeEventListener("wheel", wheel);
    };
  }, [gl]);

  useFrame((_, dt) => {
    const t = clamp(target.current);
    target.current = t;
    const c = cur.current!;
    // reduced motion: the camera jumps instead of panning
    const k = reducedMotion() ? Infinity : 7;
    const next = { cx: THREE.MathUtils.damp(c.cx, t.cx, k, dt), cz: THREE.MathUtils.damp(c.cz, t.cz, k, dt), zoom: THREE.MathUtils.damp(c.zoom, t.zoom, k, dt) };
    cur.current = next;
    if (camera.zoom !== next.zoom || camera.position.x !== next.cx || camera.position.z !== next.cz) {
      camera.zoom = next.zoom;
      camera.position.set(next.cx, 50, next.cz);
      camera.rotation.set(-Math.PI / 2, 0, 0);
      camera.updateProjectionMatrix();
      useView.getState().bumpCamera();
    }
  });
  return null;
}
