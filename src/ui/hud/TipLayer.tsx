import { useLayoutMode } from "../layoutMode";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { t } from "../../content/i18n";
import type { GameState } from "../../engine/types";
import { db, useGame } from "../context";
import { mapProjector } from "../scene/Table";
import { canUndo, safeStorage, viewerOf } from "../store";
import { pickTip, TIPS_KEY, type TipAnchor, type TipContext } from "../tips";
import { useView } from "../view";
import { moment } from "./SoundLayer";

const W = 300;
const GAP = 14;

const readSeen = (): Set<string> => {
  try {
    return new Set(JSON.parse(safeStorage().getItem(TIPS_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
};

interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
const onScreen = (r: Rect | null): r is Rect =>
  !!r && r.x1 > 0 && r.y1 > 0 && r.x0 < innerWidth && r.y0 < innerHeight && r.x1 > r.x0;
const boxOf = (el: Element | null): Rect | null => {
  if (!el) return null;
  const b = el.getBoundingClientRect();
  return { x0: b.left, y0: b.top, x1: b.right, y1: b.bottom };
};

/** where the anchor is on screen: a marked element, a card in the HUD or on the map; else the instruction bar, else null */
function anchorRect(a: TipAnchor | null): Rect | null {
  const r = !a
    ? null
    : "tip" in a
      ? boxOf(document.querySelector(`[data-tip="${a.tip}"]`))
      : (boxOf(document.querySelector(`[data-card="${a.card}"]`)) ?? mapProjector.rect(a.card));
  return onScreen(r) ? r : boxOf(document.querySelector('[data-tip="bar"]'));
}

type Side = "above" | "below" | "left" | "right";
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(lo, v), hi);

/**
 * Where the tip goes, with its arrow on the anchor: beside an anchor at the top in the middle third of the width when
 * there is room (keeping the middle of the screen clear), else above it in the lower half of the screen, below it in the
 * upper half.
 */
function place(r: Rect | null): { left: number; top: number; side: Side; arrow: number } {
  if (!r) return { left: 16, top: 64, side: "below", arrow: -1 };
  const cx = (r.x0 + r.x1) / 2;
  const cy = (r.y0 + r.y1) / 2;
  if (cy < innerHeight / 2 && cx > innerWidth / 3 && cx < (innerWidth * 2) / 3) {
    const top = Math.max(8, r.y0);
    const arrow = clamp(cy - top, 16, 60);
    if (r.x1 + GAP + W < innerWidth - 8) return { left: r.x1 + GAP, top, side: "right", arrow };
    if (r.x0 - GAP - W > 8) return { left: r.x0 - GAP - W, top, side: "left", arrow };
  }
  const left = clamp(cx - W / 2, 8, innerWidth - W - 8);
  const above = cy > innerHeight / 2;
  return {
    left,
    top: above ? r.y0 - GAP : r.y1 + GAP,
    side: above ? "above" : "below",
    arrow: clamp(cx - left, 16, W - 16),
  };
}

/**
 * A first-time player's tips, one at a time, the first time each situation comes up (see tips.ts). A tip waits until
 * nothing plays or holds the middle of the screen (the phase pause is free), never takes the pointer but its button,
 * and is seen once the choice it came with is answered, the situation passes, the viewer changes, or "Got it".
 */
export function TipLayer() {
  const game = useGame((s) => s.game) as GameState;
  const locale = useGame((s) => s.locale);
  const on = useGame((s) => s.tipsOn);
  const able = useGame(canUndo);
  const playing = useGame((s) => s.current);
  const queued = useGame((s) => s.queue.length > 0);
  const byHand = useGame((s) => s.drawByHand);
  const stageFree = useView((s) =>
    s.stage.every((k) => k.startsWith("pause:") || k.startsWith("test:")),
  );
  const quiet = useView((s) => !s.modal && !s.intro && !s.moveDrag);
  // re-placed as the map camera moves
  useView((s) => s.camTick);
  const [seen, setSeen] = useState(readSeen);
  const viewer = viewerOf(game);
  const phone = useLayoutMode() === "phone";
  const c: TipContext = {
    viewer,
    shown: true,
    canUndo: able,
    drawing: playing?.type === "token" && byHand,
    phone,
  };
  const tip = pickTip(game, c, seen, on);
  const visible =
    !!tip && quiet && ((!playing && !queued && stageFree) || (!!tip.duringDraw && c.drawing));

  const markSeen = (id: string) =>
    setSeen((s) => {
      const next = new Set(s).add(id);
      try {
        safeStorage().setItem(TIPS_KEY, JSON.stringify([...next]));
      } catch {
        // storage full or blocked: the tip may show again next time
      }
      return next;
    });
  // the tip on screen and the choice it came with: once that changes, it has been seen
  const showing = useRef<{ id: string; seq: number | undefined; viewer: string | null } | null>(
    null,
  );
  useEffect(() => {
    const was = showing.current;
    if (was && (tip?.id !== was.id || game.pending?.seq !== was.seq || viewer !== was.viewer)) {
      showing.current = null;
      markSeen(was.id);
    }
    if (visible && showing.current?.id !== tip!.id) moment("tip");
    if (visible) showing.current = { id: tip!.id, seq: game.pending?.seq, viewer };
  });

  // measured after the anchors render; again as the map camera moves or the window resizes
  const [rect, setRect] = useState<Rect | null>(null);
  const [, resized] = useState(0);
  useEffect(() => {
    const bump = () => resized((n) => n + 1);
    addEventListener("resize", bump);
    return () => removeEventListener("resize", bump);
  }, []);
  useLayoutEffect(() => {
    const r = visible ? anchorRect(tip!.anchor(game, c)) : null;
    setRect((old) =>
      old && r && old.x0 === r.x0 && old.y0 === r.y0 && old.x1 === r.x1 && old.y1 === r.y1
        ? old
        : r,
    );
  });

  if (!visible) return null;
  const p = place(rect);
  return (
    <div
      key={tip!.id}
      className={`tip-card ${p.side}`}
      style={{ left: p.left, top: p.top, width: W }}
      role="note"
    >
      <p>{t(db, locale, `tip.${tip!.id}`)}</p>
      <button onClick={() => markSeen(tip!.id)}>{t(db, locale, "tip.gotIt")}</button>
      {p.arrow >= 0 && (
        <span
          className="tip-arrow"
          style={p.side === "left" || p.side === "right" ? { top: p.arrow } : { left: p.arrow }}
        />
      )}
    </div>
  );
}
