/** Matching OCR'd Russian card images to card codes (pure; used by import-ru-cards.ts and its tests). */

export type Side = "front" | "back";

export interface CardInfo {
  code: string;
  type: string;
  /** printed landscape, per side: acts and agendas both sides, investigators their front */
  landscape: Record<Side, boolean>;
  doubleSided: boolean;
  /** Russian name(s) the card may be printed under (official translation, and the English name as a last resort) */
  names: string[];
  /** Russian text of each side, when known (official translation) */
  text: Partial<Record<Side, string>>;
  /** length of the English text of each side (Russian runs about as long): tells the sides apart without a Russian text */
  enLength: Partial<Record<Side, number>>;
}

export interface ImageInfo {
  file: string;
  source: "cards" | "pdf";
  landscape: boolean;
  title: string;
  text: string;
}

export interface Score {
  code: string;
  side: Side;
  score: number;
}

/** lower case, ё → е, letters and digits only */
export const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/g, " ")
    .trim();

const grams = (s: string): Set<string> => {
  const t = ` ${norm(s)} `;
  const out = new Set<string>();
  for (let k = 0; k + 3 <= t.length; k++) out.add(t.slice(k, k + 3));
  return out;
};

/** Dice similarity of character trigrams, 0..1 */
export function similarity(a: string, b: string): number {
  const A = grams(a);
  const B = grams(b);
  if (!A.size || !B.size) return 0;
  let n = 0;
  for (const g of A) if (B.has(g)) n++;
  return (2 * n) / (A.size + B.size);
}

/** how much of `needle` (a short name) appears in `hay` (OCR text), 0..1: share of its trigrams found */
export function contains(hay: string, needle: string): number {
  const N = grams(needle);
  if (!N.size) return 0;
  const H = grams(hay);
  let n = 0;
  for (const g of N) if (H.has(g)) n++;
  return n / N.size;
}

/** the name part of a CARDS_ru file name: no extension, copy/level suffixes or "(база)" notes */
export function fileStem(file: string): string {
  const base = file
    .split("/")
    .pop()!
    .replace(/\.[a-z]+$/i, "");
  return base
    .replace(/\s*\([^)]*\)\s*$/, "")
    .replace(/[\s_]*\d+\s*$/, "")
    .replace(/\s+-\s+.*$/, "")
    .trim();
}

/** score one image against one card side */
export function scoreSide(img: ImageInfo, card: CardInfo, side: Side): number {
  if (img.landscape !== card.landscape[side]) return 0;
  if (side === "back" && !card.doubleSided) return 0;
  const nameFromTitle = Math.max(0, ...card.names.map((n) => similarity(img.title, n)));
  const nameInText = Math.max(0, ...card.names.map((n) => contains(img.text, n)));
  const nameFromFile =
    img.source === "cards"
      ? Math.max(0, ...card.names.map((n) => similarity(fileStem(img.file), n)))
      : 0;
  const name = Math.max(nameFromTitle, nameFromFile, nameInText * 0.85);
  const known = card.text[side];
  // sides: with a known text, the body decides; without one, a little weight on the name alone
  const body = known ? similarity(img.text, known) : 0;
  const base = known ? 0.55 * name + 0.45 * Math.min(1, body * 1.6) : 0.8 * name;
  return base + 0.08 * lengthFit(norm(img.text).length, (card.enLength[side] ?? 0) * 1.1);
}

/** 1 when an OCR'd text is about as long as expected, falling to 0 at 3× longer or shorter */
export function lengthFit(got: number, expected: number): number {
  const r = Math.log((got + 20) / (expected + 20));
  return Math.max(0, 1 - Math.abs(r) / Math.log(3));
}

/** the two best card sides for an image */
export function rank(img: ImageInfo, cards: CardInfo[]): Score[] {
  const all: Score[] = [];
  for (const c of cards)
    for (const side of ["front", "back"] as Side[]) {
      const score = scoreSide(img, c, side);
      if (score > 0) all.push({ code: c.code, side, score });
    }
  return all.sort((a, b) => b.score - a.score).slice(0, 5);
}

export const ACCEPT = 0.55;
export const MARGIN = 0.06;

/** an image's match is accepted when its best score is high enough and clearly ahead of any other card */
export function accepted(scores: Score[]): Score | null {
  const [best, ...rest] = scores;
  if (!best || best.score < ACCEPT) return null;
  const other = rest.find((s) => s.code !== best.code);
  return !other || best.score - other.score >= MARGIN ? best : null;
}
