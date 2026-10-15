import { useEffect, useRef, useState } from "react";
import type { FeedEntry } from "../feed";
import { mapProjector } from "../scene/Table";
import { useView } from "../view";
import { Sentence, useFeedEntries } from "./Feed";

const STAGGER_MS = 350;
const LIFE_MS = 1500;
const MAX_VISIBLE = 3;
/** a burst bigger than this (e.g. a scenario starting) only floats its last few entries */
const BURST = 6;

interface Float {
  key: number;
  entry: FeedEntry;
  born: number;
}

/** where a float rises from: the actor's portrait or card on the map, or the screen centre if it isn't visible */
function anchorOf(e: FeedEntry): { x: number; y: number } {
  const centre = { x: innerWidth / 2, y: innerHeight * 0.42 };
  const a = e.actor;
  const p = a?.inv ? mapProjector.mini(a.inv) : null;
  const r = !p && a?.card ? mapProjector.rect(a.card) : null;
  const pt = p ?? (r ? { x: (r.x0 + r.x1) / 2, y: r.y0 + (r.y1 - r.y0) * 0.3 } : null);
  if (!pt || pt.x < 40 || pt.x > innerWidth - 40 || pt.y < 60 || pt.y > innerHeight - 60) return centre;
  return pt;
}

/**
 * Each new feed entry also rises from whoever did it and fades out, like the floating damage numbers.
 * Floats follow the camera, are staggered, and never take the pointer.
 */
export function ActionFloats() {
  const { shown, entries } = useFeedEntries();
  useView((s) => s.camTick); // re-anchor while the map moves
  const seen = useRef<{ entries: unknown; shown: number }>({ entries, shown });
  const pending = useRef<Float[]>([]);
  const [active, setActive] = useState<Float[]>([]);

  // new entries since last render go into the queue (a new game starts from its current log)
  if (seen.current.entries !== entries) seen.current = { entries, shown };
  if (shown > seen.current.shown) {
    const fresh: Float[] = [];
    for (let i = seen.current.shown; i < shown; i++) {
      const e = entries.get(i);
      if (e) fresh.push({ key: i, entry: e, born: 0 });
    }
    seen.current.shown = shown;
    pending.current.push(...(fresh.length > BURST ? fresh.slice(-MAX_VISIBLE) : fresh));
  }

  // release one queued float every STAGGER_MS, drop expired ones
  useEffect(() => {
    const id = setInterval(() => {
      const now = performance.now();
      setActive((list) => {
        let next = list.filter((f) => now - f.born < LIFE_MS);
        const last = next.at(-1)?.born ?? 0;
        if (pending.current.length && next.length < MAX_VISIBLE && now - last >= STAGGER_MS) next = [...next, { ...pending.current.shift()!, born: now }];
        return next.length === list.length && next.every((f, k) => f === list[k]) ? list : next;
      });
    }, 60);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      {active.map((f, k) => {
        const at = anchorOf(f.entry);
        // floats rising from the same spot stack instead of overlapping
        const sameSpot = active.slice(0, k).filter((o) => {
          const b = anchorOf(o.entry);
          return Math.abs(b.x - at.x) < 40 && Math.abs(b.y - at.y) < 40;
        }).length;
        return (
          <div key={f.key} className="action-float" style={{ left: at.x, top: at.y - sameSpot * 44 }}>
            <Sentence parts={f.entry.parts} size={30} />
          </div>
        );
      })}
    </>
  );
}
