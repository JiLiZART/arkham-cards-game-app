/**
 * Pure parts of the story-reader art import (import-story-art.ts runs them; ADR-0085): which painting of the campaign guide
 * editions (inspired/AHC_CYOA-main) belongs to which scenario, and the ImageMagick arguments that turn a page's picture
 * slices into one painting whose white page margin is transparent, so it sits on the reader's black.
 */
import { join } from "node:path";

export interface StoryEntry {
  campaign: string;
  scenario: string;
  /** the guide edition, under inspired/AHC_CYOA-main */
  pdf: string;
  page: number;
  /** the file under public/art/story/<campaign>/ */
  file: string;
  /** a part of the stacked slices, "WxH+X+Y" in source pixels: the page's own heading and number are in the picture */
  crop?: string;
  /** rectangles "x1,y1,x2,y2" (source pixels after the crop) painted over before the margin is keyed: a page number in the fog */
  erase?: string[];
  /** a fade of this many source pixels into the black at the bottom, where the crop cut the fog short */
  fade?: number;
  /** the output width in px */
  width: number;
}

export const GUIDES = "inspired/AHC_CYOA-main";

/** the paintings, found by looking at each scenario's page in the guide editions' PDFs */
export const STORY: StoryEntry[] = [
  {
    campaign: "night-of-the-zealot",
    scenario: "the-gathering",
    pdf: "01 Night of the Zealot.pdf",
    page: 8,
    file: "the-gathering.webp",
    crop: "1060x1510+390+30",
    fade: 170,
    width: 1400,
  },
  {
    campaign: "night-of-the-zealot",
    scenario: "the-midnight-masks",
    pdf: "01 Night of the Zealot.pdf",
    page: 20,
    file: "the-midnight-masks.webp",
    width: 1400,
  },
  {
    campaign: "night-of-the-zealot",
    scenario: "the-devourer-below",
    pdf: "01 Night of the Zealot.pdf",
    page: 28,
    file: "the-devourer-below.webp",
    crop: "1330x1730+130+20",
    erase: ["30,25,100,90"],
    fade: 170,
    width: 1400,
  },
];

/** the keying: white connected to the picture's border goes transparent, a little tolerance for the fog's near-whites */
const FUZZ = "9%";

/**
 * ImageMagick arguments: the picture slices stacked, cropped to the painting, the page numbers painted out, the white
 * margin made transparent from every corner, a fade at the bottom if asked, resized and written as WebP.
 */
export function storyArgs(e: StoryEntry, slices: string[], out: string): string[] {
  const args = [...slices, "-append", "+repage"];
  if (e.crop) args.push("-crop", e.crop, "+repage");
  for (const r of e.erase ?? []) {
    const [x1, y1, x2, y2] = r.split(",");
    args.push("-fill", "white", "-draw", `rectangle ${x1},${y1} ${x2},${y2}`);
  }
  args.push("-alpha", "set", "-fuzz", FUZZ, "-fill", "none");
  for (const corner of ["0,0", "%[fx:w-1],0", "0,%[fx:h-1]", "%[fx:w-1],%[fx:h-1]"])
    args.push("-draw", `alpha ${corner} floodfill`);
  if (e.fade) {
    // the fade strip is as wide as the crop (a fade only makes sense where a crop cut the fog short)
    const w = e.crop?.match(/^(\d+)x/)?.[1];
    if (!w) throw new Error(`${e.scenario}: a fade needs a crop`);
    args.push(
      "(",
      "-size",
      `${w}x${e.fade}`,
      "gradient:black-white",
      "-channel-fx",
      "gray=>alpha",
      ")",
      "-gravity",
      "south",
      "-compose",
      "DstOut",
      "-composite",
    );
  }
  args.push("-resize", `${e.width}x`, "-strip", "-quality", "82", out);
  return args;
}

/** the manifest the UI reads (content/art/story.json): each scenario's painting and where it came from */
export function storyManifest(entries: StoryEntry[]) {
  return {
    source: GUIDES,
    scenarios: Object.fromEntries(
      entries.map((e) => [
        e.scenario,
        { file: e.file, campaign: e.campaign, pdf: e.pdf, page: e.page },
      ]),
    ),
  };
}

/** where a painting is written */
export const storyOut = (e: StoryEntry) => join("public/art/story", e.campaign, e.file);
