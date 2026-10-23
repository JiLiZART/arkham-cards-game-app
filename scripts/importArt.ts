/** Pure parts of the rulebook art import (import-art.ts runs them): which images, and the commands that turn them into WebP. */
import { join } from "node:path";

export interface ArtEntry {
  name: string;
  /** pdfimages' object number: "<page>-<object>", the image and its soft mask */
  image: string;
  mask: string;
  /** output width in px */
  width: number;
  page: number;
  source: string;
}

const entry = (
  name: string,
  image: string,
  mask: string,
  width: number,
  source: string,
): ArtEntry => ({ name, image, mask, width, page: Number(image.slice(0, 3)), source });

/** the images used, found by looking at every large image of the rulebook (ahc100_rulebook-web.pdf) */
export const ART: ArtEntry[] = [
  entry(
    "title",
    "024-922",
    "024-923",
    1400,
    "the cover painting without the logo, fading into the dark",
  ),
  entry("parchment", "006-354", "006-355", 1000, "a portrait page with the vine border"),
  entry("parchment-wide", "002-003", "002-004", 1600, "a landscape page with the vine border"),
  entry("class-guardian", "025-925", "025-926", 1000, "a page with the Guardian emblem"),
  entry("class-seeker", "026-929", "026-930", 1000, "a page with the Seeker emblem"),
  entry("class-rogue", "027-933", "027-934", 1000, "a page with the Rogue emblem"),
  entry("class-mystic", "028-937", "028-938", 1000, "a page with the Mystic emblem"),
  entry("class-survivor", "029-941", "029-942", 1000, "a page with the Survivor emblem"),
];

/** the page colour the art fades into: the app's dark */
export const PAGE_COLOUR = "#0e0b08";

/** the page of each image in `pdfimages -list` output, in the order pdfimages numbers them (its files are counted over the whole document) */
export const pagesOfList = (list: string): number[] =>
  list
    .split("\n")
    .slice(2)
    .filter((l) => l.trim())
    .map((l) => Number(l.trim().split(/\s+/)[0]));

/** extracting one page numbers its images from 0: the document-wide number of an image minus the first one of its page */
export function pageLocal(pages: number[], object: string): string {
  const [page, n] = object.split("-").map(Number);
  const first = pages.findIndex((p) => p === page);
  if (first < 0) throw new Error(`no images on page ${page}`);
  return `${String(page).padStart(3, "0")}-${String(n - first).padStart(3, "0")}`;
}

/** where pdfimages leaves an image when only its page was extracted (`object` is the page-local one) */
export const artFile = (dir: string, object: string) => join(dir, `i-${object}.png`);

/** ImageMagick arguments: the image with its mask as alpha, laid on the page colour, resized, written as WebP */
export function magickArgs(a: ArtEntry, dir: string, out: string, pages?: number[]): string[] {
  const local = (o: string) => (pages ? pageLocal(pages, o) : o);
  return [
    artFile(dir, local(a.image)),
    artFile(dir, local(a.mask)),
    "-alpha",
    "off",
    "-channel-fx",
    "| gray=>alpha",
    "-background",
    PAGE_COLOUR,
    "-flatten",
    "-resize",
    `${a.width}x`,
    "-strip",
    "-quality",
    "80",
    out,
  ];
}

export interface ArtManifest {
  source: string;
  files: Record<string, { file: string; page: number; object: string; note: string }>;
}

export function manifestOf(source: string, entries: ArtEntry[]): ArtManifest {
  const files: ArtManifest["files"] = {};
  for (const a of [...entries].sort((x, y) => (x.name < y.name ? -1 : 1)))
    files[a.name] = { file: `${a.name}.webp`, page: a.page, object: a.image, note: a.source };
  return { source, files };
}
