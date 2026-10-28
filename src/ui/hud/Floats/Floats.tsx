import { useEffect, useRef, useState } from "react";
import type { GameEvent, InstId, InvId } from "../../../engine/types";
import { reducedMotion, whenSettled, type ScreenBox } from "../../game/arrivals";
import { FLOAT_KINDS, floatLife, gainOf, type FeedEntry } from "../../game/feed";
import { mapProjector } from "../../scene/Table";
import { useView, whenStageFree } from "../../state/view";
import { Sentence, useFeedEntries } from "../Feed";
import { moment } from "../SoundLayer";
import { useGame } from "../../state/context";
import { playGain } from "../Stats/tokenFx";
import styles from "./Floats.module.css";

const STAGGER_MS = 900;
const MAX_VISIBLE = 2;
/** a burst bigger than this (e.g. a scenario starting) only floats its last few entries */
const BURST = 6;

interface Float {
  key: number;
  entry: FeedEntry;
  born: number;
  life: number;
}

/** feed entries with no animation of their own that get a sound as they appear (the feed is on the animation clock, ADR-0002) */
const ENTRY_MOMENT: Record<string, string> = {
  resource: "resource",
  heal: "heal",
  evade: "evade",
  engage: "engage",
  discard: "discard",
  move: "move",
  reveal: "reveal",
};

/** where a float rises from: the actor's portrait or card on the map, or the screen centre if it isn't visible */
function anchorOf(e: FeedEntry): { x: number; y: number } {
  const centre = { x: innerWidth / 2, y: innerHeight * 0.42 };
  const a = e.actor;
  const p = a?.inv ? mapProjector.mini(a.inv) : null;
  const r = !p && a?.card ? mapProjector.rect(a.card) : null;
  const pt = p ?? (r ? { x: (r.x0 + r.x1) / 2, y: r.y0 + (r.y1 - r.y0) * 0.3 } : null);
  if (!pt || pt.x < 40 || pt.x > innerWidth - 40 || pt.y < 60 || pt.y > innerHeight - 60)
    return centre;
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
  const heard = useRef<string[]>([]);

  // new entries since last render go into the queue (a new game starts from its current log)
  if (seen.current.entries !== entries) seen.current = { entries, shown };
  // an undo shortens the log: its floats go, waiting or showing
  if (shown < seen.current.shown) {
    seen.current.shown = shown;
    pending.current = pending.current.filter((f) => f.key < shown);
    if (active.some((f) => f.key >= shown)) setActive(active.filter((f) => f.key < shown));
  }
  if (shown > seen.current.shown) {
    const fresh: Float[] = [];
    for (let i = seen.current.shown; i < shown; i++) {
      const e = entries.get(i);
      if (e && ENTRY_MOMENT[e.kind]) heard.current.push(ENTRY_MOMENT[e.kind]);
      // only the big moments float (phase changes get the chapter title)
      if (e && FLOAT_KINDS.has(e.kind))
        fresh.push({ key: i, entry: e, born: 0, life: floatLife(e.parts) });
    }
    seen.current.shown = shown;
    pending.current.push(...(fresh.length > BURST ? fresh.slice(-MAX_VISIBLE) : fresh));
  }

  // the sounds of the entries that just appeared (a burst of the same kind is one sound)
  useEffect(() => {
    for (const name of new Set(heard.current)) moment(name);
    heard.current = [];
  });

  // release one queued float every STAGGER_MS, drop expired ones
  useEffect(() => {
    const id = setInterval(() => {
      const now = performance.now();
      // floats wait while something holds the middle of the screen
      const free = useView.getState().stage.length === 0;
      setActive((list) => {
        let next = list.filter((f) => now - f.born < f.life);
        const last = next.at(-1)?.born ?? 0;
        if (free && pending.current.length && next.length < MAX_VISIBLE && now - last >= STAGGER_MS)
          next = [...next, { ...pending.current.shift()!, born: now }];
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
          <div
            key={f.key}
            className={styles.actionFloat}
            style={{ left: at.x, top: at.y - sameSpot * 44, ["--life" as string]: `${f.life}ms` }}
          >
            <Sentence parts={f.entry.parts} size={30} />
          </div>
        );
      })}
    </>
  );
}

// ---------- effect hits: the source card pulses and a streak flies to the investigator it hurt ----------

/** how long a streak takes from the source to the portrait (the floating numbers wait for it) */
export const HIT_MS = 450;
const HIT_GAP_MS = 550;

/** an investigator lost something to a card's effect: damage / horror, resources, or clues dropped */
export function hitOf(e: GameEvent): { source: InstId; inv: InvId } | null {
  const source = e.data?.source as InstId | null | undefined;
  if (!source || !e.inv) return null;
  if (
    e.type === "damage" ||
    (e.type === "resource" && e.data?.lost) ||
    (e.type === "clues" && e.data?.placed)
  )
    return { source, inv: e.inv };
  return null;
}

const boxOfEl = (el: Element | null): ScreenBox | null => {
  const r = el?.getBoundingClientRect();
  return r && r.width ? { x: r.left, y: r.top, w: r.width, h: r.height } : null;
};

/** where the source card is on screen: an HTML card (threat strip, panel, resolve spot) or a card on the map */
function sourceBox(id: InstId): ScreenBox | null {
  const html = boxOfEl(document.querySelector(`[data-card="${id}"]`));
  if (html) return html;
  const r = mapProjector.rect(id);
  return r ? { x: r.x0, y: r.y0, w: r.x1 - r.x0, h: r.y1 - r.y0 } : null;
}

/** the investigator's avatar in the player bar, else their portrait on the map */
function targetEl(inv: InvId): { el: HTMLElement | null; box: ScreenBox | null } {
  const el = document.querySelector<HTMLElement>(`[data-testid="pb-avatar"][data-inv="${inv}"]`);
  if (el) return { el, box: boxOfEl(el) };
  const p = mapProjector.mini(inv);
  return { el: null, box: p ? { x: p.x - 30, y: p.y - 30, w: 60, h: 60 } : null };
}

function playHit(source: InstId, inv: InvId) {
  const from = sourceBox(source);
  if (!from) return;
  const pulse = document.createElement("div");
  pulse.className = styles.hitPulse;
  Object.assign(pulse.style, {
    left: `${from.x}px`,
    top: `${from.y}px`,
    width: `${from.w}px`,
    height: `${from.h}px`,
  });
  document.body.appendChild(pulse);
  pulse
    .animate(
      [
        { opacity: 0, transform: "scale(1)" },
        { opacity: 1, transform: "scale(1.04)", offset: 0.3 },
        { opacity: 0, transform: "scale(1)" },
      ],
      { duration: 700, easing: "ease-out" },
    )
    .finished.catch(() => undefined)
    .finally(() => pulse.remove());
  if (reducedMotion()) return;
  const to = targetEl(inv);
  if (!to.box) return;
  const c0 = { x: from.x + from.w / 2, y: from.y + from.h / 2 };
  const c1 = { x: to.box.x + to.box.w / 2, y: to.box.y + to.box.h / 2 };
  const streak = document.createElement("div");
  streak.className = styles.hitStreak;
  Object.assign(streak.style, { left: `${c1.x - 14}px`, top: `${c1.y - 14}px` });
  document.body.appendChild(streak);
  const angle = Math.atan2(c1.y - c0.y, c1.x - c0.x);
  streak
    .animate(
      [
        {
          transform: `translate(${c0.x - c1.x}px, ${c0.y - c1.y}px) rotate(${angle}rad) scale(0.6, 0.6)`,
          opacity: 0,
        },
        {
          transform: `translate(${(c0.x - c1.x) * 0.6}px, ${(c0.y - c1.y) * 0.6}px) rotate(${angle}rad) scale(2.4, 0.8)`,
          opacity: 1,
          offset: 0.4,
        },
        { transform: `translate(0, 0) rotate(${angle}rad) scale(1, 1)`, opacity: 1 },
      ],
      { duration: HIT_MS, delay: 150, easing: "cubic-bezier(.5,0,.6,1)", fill: "backwards" },
    )
    .finished.catch(() => undefined)
    .finally(() => {
      streak.remove();
      to.el?.animate(
        [
          { filter: "drop-shadow(0 0 0 #f33)", transform: "scale(1)" },
          { filter: "drop-shadow(0 0 18px #f33)", transform: "scale(1.08)" },
          { filter: "drop-shadow(0 0 0 #f33)", transform: "scale(1)" },
        ],
        { duration: 420, easing: "ease-out" },
      );
    });
}

/** plays a hit for each log entry as it is shown (in step with the event animations); one effect's hits together */
export function HitFx() {
  const { shown, game } = useFeedEntries();
  const setup = useGame((s) => s.setup);
  const seen = useRef<{ setup: unknown; n: number }>({ setup, n: shown });
  const nextFree = useRef(0);
  // queued in render (kept across StrictMode's double render), played after commit
  const queue = useRef<{ source: InstId; inv: InvId }[]>([]);
  // a new game starts from its current log; an undo shortens it
  if (seen.current.setup !== setup || shown < seen.current.n) seen.current = { setup, n: shown };
  for (let i = seen.current.n; i < shown; i++) {
    // damage plays with its event (below); losses that aren't animated events play as they are logged
    const h = game.log[i].type === "damage" ? null : hitOf(game.log[i]);
    if (h) queue.current.push(h);
  }
  seen.current.n = shown;
  const playing = useView((s) => s.playing) as GameEvent | null;
  const played = useRef<unknown>(null);
  useEffect(() => {
    const h = playing?.type === "damage" ? hitOf(playing) : null;
    if (!h || played.current === playing) return;
    played.current = playing;
    playHit(h.source, h.inv);
  }, [playing]);
  useEffect(() => {
    if (!queue.current.length) return;
    const fresh = queue.current.splice(0);
    // after the cards on screen have landed (a location revealed by the move flips first) and the middle is free
    whenStageFree(() =>
      whenSettled(() => {
        let last: InstId | null = null;
        let at = Math.max(performance.now(), nextFree.current);
        for (const h of fresh) {
          if (last && h.source !== last) at += HIT_GAP_MS;
          last = h.source;
          setTimeout(() => playHit(h.source, h.inv), Math.max(0, at - performance.now()));
        }
        nextFree.current = at + HIT_GAP_MS;
      }),
    );
  });
  return null;
}

/** drops tokens on the pile for each resource gain as it is logged (in step with the event animations); one effect's gains together */
export function ResourceFx() {
  const { shown, game } = useFeedEntries();
  const setup = useGame((s) => s.setup);
  const seen = useRef<{ setup: unknown; n: number }>({ setup, n: shown });
  // queued in render (kept across StrictMode's double render), played after commit
  const queue = useRef(new Map<InvId, number>());
  // a new game starts from its current log; an undo shortens it
  if (seen.current.setup !== setup || shown < seen.current.n) seen.current = { setup, n: shown };
  for (let i = seen.current.n; i < shown; i++) {
    const g = gainOf(game.log[i]);
    if (g) queue.current.set(g.inv, (queue.current.get(g.inv) ?? 0) + g.n);
  }
  seen.current.n = shown;
  useEffect(() => {
    if (!queue.current.size) return;
    const fresh = [...queue.current];
    queue.current.clear();
    whenStageFree(() =>
      whenSettled(() => {
        for (const [inv, n] of fresh) playGain(inv, n);
      }),
    );
  });
  return null;
}
