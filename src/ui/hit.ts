/** a screen-space rectangle (px) of a board object */
export interface ScreenRect {
  id: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** the rect under a point; the last one wins where rects overlap (drawn on top) */
export function hitRect(x: number, y: number, rects: ScreenRect[]): string | null {
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1) return r.id;
  }
  return null;
}
