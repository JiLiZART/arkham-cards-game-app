/** a screen rectangle in px */
export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface HoverBox {
  /** top-left of the enlarged card */
  x: number;
  y: number;
  /** enlarged card size; the details panel sits directly below, as wide as the card */
  w: number;
  h: number;
}

const PAD = 8;

/**
 * The hover copy: twice the card's on-screen size, centred on it, then moved just enough to keep
 * card + details inside the viewport. A card too big for the window is scaled down to fit.
 */
export function placeHover(r: Rect, detailsH: number, vw: number, vh: number): HoverBox {
  let w = (r.x1 - r.x0) * 2;
  let h = (r.y1 - r.y0) * 2;
  const fit = Math.min(1, (vh - 2 * PAD - detailsH) / h, (vw - 2 * PAD) / w);
  w *= fit;
  h *= fit;
  const cx = (r.x0 + r.x1) / 2;
  const cy = (r.y0 + r.y1) / 2;
  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));
  return { w, h, x: clamp(cx - w / 2, PAD, vw - PAD - w), y: clamp(cy - h / 2, PAD, vh - PAD - h - detailsH) };
}
