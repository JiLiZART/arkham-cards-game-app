/** Node adapter (scripts/check-content.ts): reads /content from disk */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import type { CardScript } from "../engine/types";
import { buildContent } from "./loader";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

export async function loadContentFromDisk(root = process.cwd()) {
  const all = walk(join(root, "content"));
  const files: Record<string, unknown> = {};
  const scripts: Record<string, CardScript> = {};
  for (const p of all) {
    const key = "/" + relative(root, p).split("\\").join("/");
    if (p.endsWith(".json")) {
      try {
        files[key] = JSON.parse(readFileSync(p, "utf8"));
      } catch (e) {
        throw new Error(`${key}: invalid JSON (${(e as Error).message})`);
      }
    } else if (/\/scripts\/[^/]+\.ts$/.test(key)) {
      scripts[key] = (await import(pathToFileURL(p).href)).default;
    }
  }
  return buildContent(files, scripts);
}
