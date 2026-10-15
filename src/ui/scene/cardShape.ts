import * as THREE from "three";

/** corner radius of a printed card, as a share of its shorter side */
export const CORNER = 0.05;
/** width of the highlight frame around a card (half the old 0.06) */
export const FRAME = 0.03;

function roundedRect<T extends THREE.Path>(path: T, w: number, h: number, r: number): T {
  const x = -w / 2;
  const y = -h / 2;
  path.moveTo(x + r, y);
  path.lineTo(x + w - r, y);
  path.quadraticCurveTo(x + w, y, x + w, y + r);
  path.lineTo(x + w, y + h - r);
  path.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  path.lineTo(x + r, y + h);
  path.quadraticCurveTo(x, y + h, x, y + h - r);
  path.lineTo(x, y + r);
  path.quadraticCurveTo(x, y, x + r, y);
  return path;
}

const faces = new Map<string, THREE.ShapeGeometry>();
const frames = new Map<string, THREE.ShapeGeometry>();

/** a flat card face with rounded corners; UVs span the card so a scan texture fits exactly */
export function cardFace(w: number, h: number): THREE.ShapeGeometry {
  const key = `${w}x${h}`;
  const hit = faces.get(key);
  if (hit) return hit;
  const g = new THREE.ShapeGeometry(roundedRect(new THREE.Shape(), w, h, CORNER * Math.min(w, h)), 6);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / w, (pos.getY(i) + h / 2) / h);
  uv.needsUpdate = true;
  faces.set(key, g);
  return g;
}

/** a thin rounded frame hugging a card of size w×h */
export function cardFrame(w: number, h: number): THREE.ShapeGeometry {
  const key = `${w}x${h}`;
  const hit = frames.get(key);
  if (hit) return hit;
  const r = CORNER * Math.min(w, h);
  const outer = roundedRect(new THREE.Shape(), w + 2 * FRAME, h + 2 * FRAME, r + FRAME);
  outer.holes.push(roundedRect(new THREE.Path(), w, h, r));
  const g = new THREE.ShapeGeometry(outer, 6);
  frames.set(key, g);
  return g;
}
