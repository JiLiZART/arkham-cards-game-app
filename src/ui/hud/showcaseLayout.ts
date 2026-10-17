export const CARD_RATIO = 1.4;
const MAX_W = 340;
const GAP = 18;
/** side margin of the screen, and the room the help line, the bar and the details need above and below the cards */
const SIDE = 120;
const VERTICAL = 200;

/**
 * Columns and card width for n showcased cards on a vw × vh screen: the widest cards (at most 340 px) such that every
 * card is visible without scrolling. Four to a row at most up to eight cards (two rows), then the cards shrink further.
 */
export function showcaseLayout(n: number, vw: number, vh: number): { cols: number; width: number } {
  let best = { cols: 1, width: 0 };
  // never more than four to a row up to eight cards; past that any count that fits
  for (let cols = 1; cols <= (n <= 8 ? Math.min(n, 4) : n); cols++) {
    const rows = Math.ceil(n / cols);
    const fitsW = (vw - SIDE) / cols - GAP;
    const fitsH = (vh - VERTICAL - (rows - 1) * GAP) / (rows * CARD_RATIO);
    const width = Math.floor(Math.min(MAX_W, fitsW, fitsH));
    // a wider card wins; on a tie fewer columns (a balanced block)
    if (width > best.width) best = { cols, width };
  }
  return best;
}
