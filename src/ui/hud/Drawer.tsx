import { useEffect, useRef, type ReactNode } from "react";
import { useView } from "../view";
import { moment } from "./SoundLayer";

type Edge = "left" | "right";

/** how far in from the edge a swipe must start, and how far it must travel to open the drawer */
const EDGE_ZONE = 28;
const SWIPE = 40;

/**
 * A drawer on the phone layout (ADR-0005): a handle on its edge, a swipe in from that edge or a tap on the handle opens
 * it over the map, a tap outside (on the shade) closes it. `glow` makes the handle pulse (something inside waits for a tap). Its content stays inside the safe-area insets.
 */
export function Drawer({
  edge,
  handle,
  label,
  glow,
  children,
}: {
  edge: Edge;
  handle: ReactNode;
  label: string;
  glow?: boolean;
  children: ReactNode;
}) {
  const open = useView((s) => s.drawer === edge);
  const setDrawer = useView((s) => s.setDrawer);
  const start = useRef<{ x: number; y: number } | null>(null);
  // a swipe in from this edge opens the drawer (the map's own drags start further in)
  useEffect(() => {
    const down = (e: PointerEvent) => {
      const near = edge === "left" ? e.clientX <= EDGE_ZONE : e.clientX >= innerWidth - EDGE_ZONE;
      start.current = near && !useView.getState().drawer ? { x: e.clientX, y: e.clientY } : null;
    };
    const move = (e: PointerEvent) => {
      const s = start.current;
      if (!s) return;
      const dx = edge === "left" ? e.clientX - s.x : s.x - e.clientX;
      if (dx > SWIPE && Math.abs(e.clientY - s.y) < dx) {
        start.current = null;
        setDrawer(edge);
      }
    };
    const up = () => (start.current = null);
    window.addEventListener("pointerdown", down, true);
    window.addEventListener("pointermove", move, true);
    window.addEventListener("pointerup", up, true);
    return () => {
      window.removeEventListener("pointerdown", down, true);
      window.removeEventListener("pointermove", move, true);
      window.removeEventListener("pointerup", up, true);
    };
  }, [edge, setDrawer]);
  // opening and closing have a sound (not the first paint)
  const was = useRef(open);
  useEffect(() => {
    if (was.current !== open) moment(open ? "open" : "close");
    was.current = open;
  }, [open]);
  // Escape closes it
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(null);
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open, setDrawer]);
  return (
    <>
      {!open && (
        <button
          className={`drawer-handle ${edge} ${glow ? "glow" : ""}`}
          aria-label={label}
          title={label}
          onClick={() => setDrawer(edge)}
        >
          {handle}
        </button>
      )}
      {open && <div className="drawer-shade" onClick={() => setDrawer(null)} />}
      <aside
        className={`drawer ${edge} ${open ? "open" : ""}`}
        aria-hidden={!open}
        aria-label={label}
      >
        {children}
      </aside>
    </>
  );
}
