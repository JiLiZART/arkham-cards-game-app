/**
 * Download every card scan the game uses into <out>/cards/ (the GitHub Pages build).
 * The scans come from the arkham.build CDN, which sends no CORS headers, so WebGL can only use them same-origin:
 * the dev server proxies /cards/* there, and on Pages they are files next to the game.
 * Files are kept in .cache/cards between runs. A scan that can't be fetched is listed but doesn't fail the
 * run (the game draws that card's face instead).
 *
 *   npm run fetch:cards -- dist
 */
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { ContentDb } from "../src/engine/types";
import { loadContentFromDisk } from "../src/content/node";
import { asset, cardImage } from "../src/ui/assets/images";

const CDN = "https://cdn.arkham.build/optimized";
const CACHE = ".cache/cards";
const PARALLEL = 8;

/** file names (e.g. "01001.webp", "01104b.webp") of every scan the game requests from the cards folder */
export function cardFiles(db: Pick<ContentDb, "cards">): string[] {
  const prefix = `${asset("cards")}/`;
  const out = new Set<string>();
  for (const card of Object.values(db.cards))
    for (const side of ["front", "back"] as const) {
      const url = cardImage(card, side);
      // cards with their own image URL aren't served from the cards folder
      if (url?.startsWith(prefix)) out.add(url.slice(prefix.length));
    }
  return [...out].sort();
}

async function download(file: string): Promise<boolean> {
  const dest = join(CACHE, file);
  if (existsSync(dest)) return true;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${CDN}/${file}`);
      if (res.ok) {
        writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
        return true;
      }
    } catch {
      // network error: retry once
    }
  }
  return false;
}

async function main(outDir: string) {
  const { db } = await loadContentFromDisk();
  const files = cardFiles(db);
  mkdirSync(CACHE, { recursive: true });
  const missing: string[] = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: PARALLEL }, async () => {
      while (next < files.length) {
        const file = files[next++];
        if (!(await download(file))) missing.push(file);
      }
    }),
  );
  const target = join(outDir, "cards");
  mkdirSync(target, { recursive: true });
  for (const f of files) if (!missing.includes(f)) copyFileSync(join(CACHE, f), join(target, f));
  console.log(`card scans: ${files.length - missing.length}/${files.length} in ${target}`);
  if (missing.length) console.warn(`missing (drawn faces instead): ${missing.sort().join(", ")}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await main(process.argv[2] ?? "dist");
