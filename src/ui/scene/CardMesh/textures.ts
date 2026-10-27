import { useEffect, useState } from "react";
import * as THREE from "three";
import type { CardDef } from "../../../content/schema";
import { useGame } from "../../state/context";
import {
  backUrl,
  cardImage,
  FACTION_COLORS,
  faceLines,
  isEncounterCard,
} from "../../assets/images";

const W = 360;
const H = 504;
const cache = new Map<string, THREE.Texture>();
const failed = new Set<string>();
const loader = new THREE.TextureLoader();

function canvas(landscape: boolean) {
  const c = document.createElement("canvas");
  c.width = landscape ? H : W;
  c.height = landscape ? W : H;
  return c;
}

function finish(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 16;
  return t;
}

/** text-based card face used until (or instead of) the scanned image */
export function drawnFace(
  card: CardDef,
  side: "front" | "back",
  name: string,
  text: string,
  landscape: boolean,
): THREE.Texture {
  const key = `drawn:${card.code}:${side}:${name}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = canvas(landscape);
  const g = c.getContext("2d")!;
  const color = FACTION_COLORS[card.faction] ?? "#555";
  g.fillStyle = "#e9e0c9";
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, 64);
  g.strokeStyle = "#2a2116";
  g.lineWidth = 8;
  g.strokeRect(4, 4, c.width - 8, c.height - 8);
  const lines = faceLines(card, side, name, text);
  g.fillStyle = "#fff";
  g.font = "bold 26px Georgia, serif";
  g.fillText(lines.title.slice(0, 26), 16, 42);
  g.fillStyle = "#3b2f20";
  g.font = "italic 17px Georgia, serif";
  wrapFill(g, lines.stats, 16, 92, c.width - 32, 20);
  g.font = "18px Georgia, serif";
  let y = 150;
  for (const l of lines.body) {
    if (y > c.height - 20) break;
    g.fillText(l, 16, y);
    y += 22;
  }
  g.font = "bold 14px sans-serif";
  g.fillStyle = color;
  g.fillText(card.type.toUpperCase(), 16, c.height - 16);
  const t = finish(c);
  cache.set(key, t);
  return t;
}

function wrapFill(
  g: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  w: number,
  lh: number,
) {
  let line = "";
  for (const word of s.split(" ")) {
    if (g.measureText(line + word).width > w) {
      g.fillText(line, x, y);
      y += lh;
      line = "";
    }
    line += word + " ";
  }
  g.fillText(line, x, y);
}

/** generic card backs: the official player and encounter back art (public/table, from the ArkhamCards assets) */
export function backTexture(kind: "player" | "encounter", landscape = false): THREE.Texture {
  const key = `back:${kind}:${landscape}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const t = loader.load(backUrl(kind));
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 16;
  if (landscape) {
    t.center.set(0.5, 0.5);
    t.rotation = Math.PI / 2;
  }
  cache.set(key, t);
  return t;
}

/**
 * Texture for one side of a card: the drawn face immediately, swapped for the scanned image once it loads.
 * Failed images (offline, 404) keep the drawn face.
 */
export function useCardTexture(
  card: CardDef,
  side: "front" | "back",
  name: string,
  text: string,
  landscape: boolean,
): THREE.Texture {
  // the cache is keyed by URL, so switching the language swaps in the other locale's image
  const locale = useGame((s) => s.locale);
  const url = cardImage(card, side, locale);
  const genericBack = () => backTexture(isEncounterCard(card) ? "encounter" : "player", landscape);
  const fallback = () =>
    side === "back" && !url ? genericBack() : drawnFace(card, side, name, text, landscape);
  const [tex, setTex] = useState<THREE.Texture>(() => (url && cache.get(url)) || fallback());
  useEffect(() => {
    if (!url) {
      setTex(fallback());
      return;
    }
    const hit = cache.get(url);
    if (hit) {
      setTex(hit);
      return;
    }
    setTex(failed.has(url) && side === "back" ? genericBack() : fallback());
    if (failed.has(url)) return;
    let alive = true;
    loader.load(
      url,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 16; // clamped to the GPU maximum by three.js
        t.generateMipmaps = true;
        t.minFilter = THREE.LinearMipmapLinearFilter;
        cache.set(url, t);
        if (alive) setTex(t);
      },
      undefined,
      () => {
        failed.add(url);
        // a back scan that can't load shows the generic card back
        if (alive && side === "back") setTex(genericBack());
      },
    );
    return () => {
      alive = false;
    };
  }, [url, name]);
  return tex;
}
