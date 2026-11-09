/**
 * Extract the story reader's paintings from the campaign guide editions (inspired/AHC_CYOA-main) into public/art/story,
 * and write their manifest (content/art/story.json). Needs pdfimages (poppler) and ImageMagick.   pnpm import:story-art
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { GUIDES, STORY, storyArgs, storyManifest, storyOut } from "./importStoryArt";

const dir = mkdtempSync(join(tmpdir(), "story-art-"));
try {
  for (const [k, e] of STORY.entries()) {
    const pdf = join(GUIDES, e.pdf);
    const prefix = join(dir, `e${k}`);
    execFileSync("pdfimages", ["-j", "-f", String(e.page), "-l", String(e.page), pdf, prefix]);
    // the page's picture comes in slices, the large JPEGs, top to bottom (the small ones are the page's watermark)
    const slices = readdirSync(dir)
      .filter((f) => f.startsWith(`e${k}-`) && f.endsWith(".jpg"))
      .sort()
      .map((f) => join(dir, f))
      .filter(
        (f) => Number(execFileSync("magick", ["identify", "-format", "%w", f]).toString()) >= 1000,
      );
    if (!slices.length) throw new Error(`${e.scenario}: no picture on page ${e.page} of ${e.pdf}`);
    const out = storyOut(e);
    mkdirSync(dirname(out), { recursive: true });
    execFileSync("magick", storyArgs(e, slices, out));
    console.log(`${e.scenario.padEnd(22)} ${(statSync(out).size / 1024).toFixed(0)} KB`);
  }
  writeFileSync("content/art/story.json", JSON.stringify(storyManifest(STORY), null, 1) + "\n");
} finally {
  rmSync(dir, { recursive: true, force: true });
}
