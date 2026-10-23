/**
 * Extract the menu backgrounds from the core rulebook (inspired/ahc100_rulebook-web.pdf): the cover painting, the parchment
 * pages and the five class pages, as WebP in public/art with a manifest in content/art/art.json. Needs pdfimages (poppler)
 * and ImageMagick.   npm run import:art
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ART, manifestOf, magickArgs, pagesOfList } from "./importArt";

const PDF = "inspired/ahc100_rulebook-web.pdf";
const OUT = "public/art";

const dir = mkdtempSync(join(tmpdir(), "rulebook-art-"));
try {
  // pdfimages counts images over the whole document, but extracting a page numbers them from 0: the list maps one to the other
  const list = pagesOfList(
    execFileSync("pdfimages", ["-list", PDF], { maxBuffer: 1 << 26 }).toString(),
  );
  const pages = [...new Set(ART.map((a) => a.page))];
  for (const p of pages)
    execFileSync("pdfimages", [
      "-png",
      "-p",
      "-f",
      String(p),
      "-l",
      String(p),
      PDF,
      join(dir, "i"),
    ]);
  mkdirSync(OUT, { recursive: true });
  mkdirSync("content/art", { recursive: true });
  for (const a of ART)
    execFileSync("magick", magickArgs(a, dir, join(OUT, `${a.name}.webp`), list));
  writeFileSync("content/art/art.json", JSON.stringify(manifestOf(PDF, ART), null, 1) + "\n");
  for (const a of ART)
    console.log(
      `${a.name.padEnd(16)} ${(statSync(join(OUT, `${a.name}.webp`)).size / 1024).toFixed(0)} KB`,
    );
} finally {
  rmSync(dir, { recursive: true, force: true });
}
