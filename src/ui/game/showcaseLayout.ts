export const CARD_RATIO = 1.4;
const MAX_W = 340;
const GAP = 18;
/** side margin of the screen, and the room the help line, the bar and the details need above and below the cards */
const SIDE = 120;
const VERTICAL = 200;
/** on the phone the help line stands in a column beside the cards: width goes to it, the height to the cards */
const PHONE_SIDE = 260;
const PHONE_VERTICAL = 24;

/**
 * Columns and card width for n showcased cards on a vw × vh screen: the widest cards (at most 340 px) such that every
 * card is visible without scrolling. On the phone (`phone`) the help line stands beside the cards, so they take the height. Four to a row at most up to eight cards (two rows), then the cards shrink further.
 */
export function showcaseLayout(
  n: number,
  vw: number,
  vh: number,
  phone = false,
): { cols: number; width: number } {
  const side = phone ? PHONE_SIDE : SIDE;
  const vertical = phone ? PHONE_VERTICAL : VERTICAL;
  let best = { cols: 1, width: 0 };
  // never more than four to a row up to eight cards; past that any count that fits
  for (let cols = 1; cols <= (n <= 8 ? Math.min(n, 4) : n); cols++) {
    const rows = Math.ceil(n / cols);
    const fitsW = (vw - side) / cols - GAP;
    const fitsH = (vh - vertical - (rows - 1) * GAP) / (rows * CARD_RATIO);
    const width = Math.floor(Math.min(MAX_W, fitsW, fitsH));
    // a wider card wins; on a tie fewer columns (a balanced block)
    if (width > best.width) best = { cols, width };
  }
  return best;
}

/** room the phone's top bar and instruction bar take above and below the resolving card (PHONE_INSETS plus a gap) */
const PHONE_RESOLVE_TOP = 40;
const PHONE_RESOLVE_BOTTOM = 124;

/** where the card being resolved (a treachery, an event being played) stands: under the prompt banner on the desktop, between the top bar and the instruction bar on the phone */
export function resolveBox(
  vw: number,
  vh: number,
  phone: boolean,
): { x: number; y: number; w: number; h: number } {
  if (!phone) return { x: vw / 2 - 130, y: 120, w: 260, h: 364 };
  const h = vh - PHONE_RESOLVE_TOP - PHONE_RESOLVE_BOTTOM;
  const w = Math.round(h / CARD_RATIO);
  return { x: Math.round(vw / 2 - w / 2), y: PHONE_RESOLVE_TOP, w, h };
}
