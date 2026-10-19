/**
 * The README's sound credits, made from content/sounds/sounds.json: every source a clip or track uses, once. Usage:
 * npm run sound-credits (rewrites the section); check:content fails when the README is behind the manifest.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { SoundManifest } from "../src/content/schema";

const SITES: Record<string, string> = { "kenney.nl": "Kenney", "opengameart.org": "OpenGameArt" };
const HEADING = "## Sound credits";

export function soundCredits(m: SoundManifest): string {
  const sources = new Map<string, string>();
  for (const c of [...Object.values(m.effects), ...Object.values(m.music)]) if (!sources.has(c.source)) sources.set(c.source, c.author);
  const sites = [...new Set([...sources.keys()].map((u) => SITES[new URL(u).hostname] ?? new URL(u).hostname))];
  const name = (u: string) => decodeURIComponent(new URL(u).pathname.split("/").filter(Boolean).pop() ?? u).replace(/-/g, " ");
  return [`All sounds are CC0 (public domain), from ${sites.join(" and ")}:`, "", ...[...sources].map(([u, author]) => `- [${name(u)}](${u}) by ${author} (CC0)`)].join("\n");
}

/** the README with its Sound credits section's body replaced */
export function replaceCredits(readme: string, body: string): string {
  const start = readme.indexOf(`${HEADING}\n`);
  if (start < 0) throw new Error(`the README has no "${HEADING}" section`);
  const from = start + HEADING.length + 1;
  const next = readme.indexOf("\n## ", from);
  return `${readme.slice(0, from)}\n${body}\n${next < 0 ? "" : readme.slice(next)}`;
}

if (process.argv[1]?.endsWith("sound-credits.ts")) {
  const m = SoundManifest.parse(JSON.parse(readFileSync("content/sounds/sounds.json", "utf8")));
  writeFileSync("README.md", replaceCredits(readFileSync("README.md", "utf8"), soundCredits(m)));
  console.log("README sound credits rewritten");
}
