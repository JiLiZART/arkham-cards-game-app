/**
 * The per-card image folders of inspired/Arkham_Horror_LCG/покарточная сборка: one image per card side, named by the
 * card's number inside its cycle (the last three digits of the ArkhamDB code), so no OCR is needed to know which card
 * an image is. `06_1.png` is card 6 with one copy, `104a`/`104b` the two sides of card 104, `128-129b` one back for
 * cards 128 and 129. Names the grammar does not cover (minis, act sides, variants) are left to the OCR pipeline.
 */
export type FolderSide = "front" | "back";

export interface ImageName {
  from: number;
  to: number;
  side: FolderSide;
  /** the `_k` or `(k)` suffix of a one-sided card: how many copies the card has */
  copies?: number;
}

export interface CodeInfo {
  quantity: number;
  doubleSided: boolean;
}

export interface FolderPick {
  code: string;
  side: FolderSide;
  /** the file's name inside its folder */
  file: string;
}

const IMAGE = /\.(png|jpe?g|webp)$/i;
// number, optional run end, optional side letter (Latin or Cyrillic look-alikes), optional copies
const NAME = /^(\d{1,3})(?:-(\d{1,3}))?(?:\s*([aAаАbBбБ]))?(?:_(\d{1,2})|\s*\((\d{1,2})\)|_)?$/;
const FRONT = /[aAаА]/;

/** what an image file name says, or null when the grammar does not cover it */
export function parseImageName(name: string): ImageName | null {
  const m = NAME.exec(name.replace(IMAGE, ""));
  if (!m) return null;
  const from = Number(m[1]);
  const letter = m[3];
  const copies = m[4] ?? m[5];
  return {
    from,
    to: m[2] ? Number(m[2]) : from,
    side: letter && !FRONT.test(letter) ? "back" : "front",
    // copies only say something about a card without a side letter
    ...(copies && !letter ? { copies: Number(copies) } : {}),
  };
}

/** standalone scenarios have their own code ranges */
const STANDALONE: Record<string, string> = { sa_01: "81", sa_02: "82", sa_03: "70", sa_04: "71", sa_05: "72" };

/** the two leading digits of the codes a folder holds: `02_…` is cycle 2, `0xR_…` a Return-to box (50 on) */
export function codePrefix(folder: string): string | null {
  const ret = /^(\d{2})R_/.exec(folder);
  if (ret) return String(49 + Number(ret[1])).padStart(2, "0");
  const cycle = /^(\d{2})_/.exec(folder);
  if (cycle) return cycle[1];
  return STANDALONE[folder.slice(0, 5).toLowerCase()] ?? null;
}

export interface FolderResult {
  picks: FolderPick[];
  /** parsed, but no card to put it on (wrong number, a back for a one-sided card, copies that disagree) */
  rejected: string[];
  /** names the grammar does not cover */
  unparsed: string[];
  /** a second file for a card side that already has one */
  extra: string[];
}

/** map one folder's files onto card sides; `codes` holds every content card by code */
export function resolveFolder(folder: string, files: string[], codes: Map<string, CodeInfo>): FolderResult {
  const prefix = codePrefix(folder);
  const out: FolderResult = { picks: [], rejected: [], unparsed: [], extra: [] };
  if (!prefix) return out;
  const taken = new Set<string>();
  for (const file of files.filter((f) => IMAGE.test(f)).sort()) {
    const n = parseImageName(file);
    if (!n) {
      out.unparsed.push(file);
      continue;
    }
    const hits: FolderPick[] = [];
    for (let i = n.from; i <= n.to; i++) {
      const code = prefix + String(i).padStart(3, "0");
      const info = codes.get(code);
      if (!info) continue;
      if (n.side === "back" && !info.doubleSided) continue;
      if (n.copies !== undefined && n.copies !== info.quantity) continue;
      hits.push({ code, side: n.side, file });
    }
    if (!hits.length) {
      out.rejected.push(file);
      continue;
    }
    for (const h of hits) {
      const key = `${h.code}:${h.side}`;
      if (taken.has(key)) out.extra.push(file);
      else {
        taken.add(key);
        out.picks.push(h);
      }
    }
  }
  return out;
}

/** the codes a PDF's cards can have: a list of two-digit prefixes, "all" when its range is unknown, null when it has no cards */
export function pdfScope(pdf: string): string[] | "all" | null {
  if (/жетоны|playmat|\(old\)/i.test(pdf)) return null;
  const ret = /^(\d{2})R_/.exec(pdf);
  if (ret) return [String(49 + Number(ret[1])).padStart(2, "0"), ret[1]];
  const cycle = /^(\d{2})_/.exec(pdf);
  if (cycle) return [cycle[1]];
  const standalone = STANDALONE[pdf.slice(0, 5).toLowerCase()];
  return standalone ? [standalone] : "all";
}
