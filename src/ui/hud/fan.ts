/** hand cards are drawn at a readable size: 300×420 px */
export const FAN_CARD_W = 300;
export const FAN_CARD_H = 420;
/** at rest about 45% of a card shows above the bottom edge */
export const FAN_REST_VISIBLE = 189;
/** cards with an option in the pending choice rise this far above the others */
export const FAN_LEGAL_RAISE = 36;
/** room kept for the stat bar on the left of the hand and the action rail on the right */
export const STAT_BAR_W = 420;
export const RAIL_W = 172;

export interface FanSlot {
  /** card centre, px from the fan's left edge */
  x: number;
  /** extra drop below the baseline (px), larger toward the edges */
  y: number;
  /** degrees */
  rotate: number;
}

/** width available to the hand fan for a viewport width */
export const fanWidth = (viewportW: number) => Math.max(FAN_CARD_W, viewportW - RAIL_W - STAT_BAR_W - 24);

/** Hearthstone-style fan: cards on an arc, overlap tightening as the hand grows */
export function fanLayout(n: number, width: number, cardW = FAN_CARD_W): FanSlot[] {
  if (n <= 0) return [];
  const step = n > 1 ? Math.min(cardW * 0.85, (width - cardW) / (n - 1)) : 0;
  const mid = (n - 1) / 2;
  // tall cards: a gentle tilt (±8° at most) so edge cards stay clear of the stat bar and rail
  const angleStep = n > 1 ? Math.min(3, 16 / (n - 1)) : 0;
  return Array.from({ length: n }, (_, i) => {
    const off = i - mid;
    const rotate = off * angleStep;
    return { x: width / 2 + off * step, y: (Math.abs(rotate) / 8) ** 2 * 26, rotate };
  });
}

/** hover zoom for a hand card (1.28×, about 384×538 px), or as much as fits the window height */
export const HAND_HOVER_ZOOM = 1.28;
export const hoverScale = (viewportH: number) => Math.min(HAND_HOVER_ZOOM, (viewportH - 16 - 12) / FAN_CARD_H);
/** lift that puts a hovered card's bottom 12 px above the screen edge */
export const HOVER_LIFT = -(FAN_CARD_H - FAN_REST_VISIBLE + 12);

/** how far (px) the Dock magnification reaches either side of the pointer, from the gap between card centres */
export const dockRadius = (step: number) => Math.min(1.5 * FAN_CARD_W, Math.max(0.6 * FAN_CARD_W, 2.2 * step));

/** macOS Dock falloff: 1 with the pointer on the card centre, easing to 0 at `radius` */
export function dockWeight(cardX: number, pointerX: number, radius: number): number {
  const d = Math.abs(cardX - pointerX);
  return d >= radius ? 0 : Math.cos(((Math.PI / 2) * d) / radius) ** 2;
}

/** a card's transform at magnification weight w: from its resting arc place (w = 0) to unrotated, lifted and ×k (w = 1) */
export function dockTransform(slot: FanSlot, w: number, k: number, raise = 0): string {
  const y = (slot.y - raise) * (1 - w) + HOVER_LIFT * w;
  return `translateY(${y}px) rotate(${slot.rotate * (1 - w)}deg) scale(${1 + (k - 1) * w})`;
}

/** screen rect of a card at weight w (ignoring its leftover tilt), for the details column; fanLeft is the fan's left edge */
export function dockRect(slot: FanSlot, w: number, k: number, raise: number, fanLeft: number, vh: number) {
  const s = 1 + (k - 1) * w;
  const bottom = vh + (FAN_CARD_H - FAN_REST_VISIBLE) + (slot.y - raise) * (1 - w) + HOVER_LIFT * w;
  const cx = fanLeft + slot.x;
  return { x0: cx - (FAN_CARD_W * s) / 2, x1: cx + (FAN_CARD_W * s) / 2, y0: bottom - FAN_CARD_H * s, y1: bottom };
}
