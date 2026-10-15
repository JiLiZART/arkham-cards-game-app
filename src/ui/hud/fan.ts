import { SAFE_INSETS } from "../safeArea";

export const FAN_CARD_W = 150;
export const FAN_CARD_H = 210;
/** room kept for the stat bar on the left of the hand */
export const STAT_BAR_W = 270;

export interface FanSlot {
  /** card centre, px from the fan's left edge */
  x: number;
  /** extra drop below the baseline (px), larger toward the edges */
  y: number;
  /** degrees */
  rotate: number;
}

/** width available to the hand fan for a viewport width */
export const fanWidth = (viewportW: number) => Math.max(FAN_CARD_W, viewportW - SAFE_INSETS.right - STAT_BAR_W - 24);

/** Hearthstone-style fan: cards on an arc, overlap tightening as the hand grows */
export function fanLayout(n: number, width: number, cardW = FAN_CARD_W): FanSlot[] {
  if (n <= 0) return [];
  const step = n > 1 ? Math.min(cardW * 0.85, (width - cardW) / (n - 1)) : 0;
  const mid = (n - 1) / 2;
  const angleStep = n > 1 ? Math.min(6, 36 / (n - 1)) : 0;
  return Array.from({ length: n }, (_, i) => {
    const off = i - mid;
    const rotate = off * angleStep;
    return { x: width / 2 + off * step, y: (Math.abs(rotate) / 18) ** 2 * 34, rotate };
  });
}
