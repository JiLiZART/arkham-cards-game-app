/**
 * `npm run import:sounds -- --candidates`: fetches the candidate packs once, draws five files for every slot in
 * sound-candidates.ts, renders each at the same loudness as the shipped clips (so they compare fairly in the picker) into
 * sounds-src/candidates/<slot>/<id of the original>, and writes content/sounds/candidates.json with their provenance. Safe to run again:
 * previews that exist are kept.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { CANDIDATES_PER_SLOT, SoundCandidates, type SoundCandidate } from "../src/content/schema";
import { encodeArgs, levelFilter, measure, run } from "./import-sounds";
import { candidateOrder, inventory, SLOTS, type Slot, type Source } from "./sound-candidates";
import { ffmpegProbe, parseDuration } from "./sound-probe";
import { ensureLoose, ensurePack, LOOSE, PACKS } from "./sound-packs";

const ROOT = "sounds-src";
const OUT = "content/sounds/candidates.json";
/** effects longer than this are loops or ambience, not a one-shot; a track shorter than that is a jingle */
const EFFECT_MAX = 8;
const EFFECT_PREVIEW = 4;
const TRACK_MIN = 20;
const TRACK_PREVIEW = 300;

const dirOf = (slot: string) => slot.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
const sha256 = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");
const duration = (path: string) => parseDuration(spawnSync("ffmpeg", ["-hide_banner", "-i", path], { encoding: "utf8" }).stderr);

/** one slot's five candidates: the first files in its order that are the right length, each with a preview rendered */
function draw(slot: Slot, files: Source[], previewDir: string): SoundCandidate[] {
  const out: SoundCandidate[] = [];
  mkdirSync(`${ROOT}/candidates/${previewDir}`, { recursive: true });
  for (const f of candidateOrder(slot, files)) {
    if (out.length === CANDIDATES_PER_SLOT) break;
    const original = `${ROOT}/${f.path}`;
    const len = duration(original);
    if (len === null || (slot.kind === "effect" ? len > EFFECT_MAX || len < 0.03 : len < TRACK_MIN)) continue;
    const music = slot.kind === "music";
    const preview = `${previewDir}/${createHash("sha1").update(f.path).digest("hex").slice(0, 8)}.${music ? "m4a" : "mp3"}`;
    const file = `${ROOT}/candidates/${preview}`;
    if (!existsSync(file)) {
      const input = ["-i", original];
      const trim: [number, number] = [0, music ? TRACK_PREVIEW : Math.min(len, EFFECT_PREVIEW)];
      run(encodeArgs(music ? "aac" : "effect", input, file, trim, levelFilter(music ? "music" : "effect", measure(music ? "music" : "effect", input, trim))));
    }
    const base = f.path.split("/").pop() as string;
    const seam = music ? ffmpegProbe(`${ROOT}/candidates`).seam(preview, 0) : null;
    out.push({ original: f.path, preview, source: f.source, author: f.author, license: "CC0", description: `${base} · ${f.path.split("/")[0]}`, sha256: sha256(original), ...(seam === null ? {} : { seam: Math.round(Math.abs(seam) * 10) / 10 }) });
  }
  return out;
}

export async function buildCandidates() {
  for (const p of PACKS) await ensurePack(p, ROOT).catch((e) => console.warn(`warning: ${e.message}; its slots are filled from the other packs`));
  for (const l of LOOSE) await ensureLoose(l, ROOT).catch((e) => console.warn(`warning: ${e.message}; its slots are filled from the other packs`));
  const files = inventory((rel) => (existsSync(`${ROOT}/${rel}`) ? (readdirSync(`${ROOT}/${rel}`, { recursive: true }) as string[]) : []), (rel) => existsSync(`${ROOT}/${rel}`));
  const slots: SoundCandidates["slots"] = {};
  for (const slot of SLOTS) {
    const candidates = draw(slot, files, dirOf(slot.id));
    if (candidates.length < CANDIDATES_PER_SLOT) throw new Error(`${slot.id}: only ${candidates.length} usable files in the packs, need ${CANDIDATES_PER_SLOT}; add a pattern or a pack in sound-candidates.ts`);
    slots[slot.id] = { kind: slot.kind, where: slot.where, candidates };
  }
  writeFileSync(OUT, `${JSON.stringify(SoundCandidates.parse({ slots }), null, 2)}\n`);
  console.log(`candidates: ${SLOTS.length} slots × ${CANDIDATES_PER_SLOT}, written to ${OUT}`);
}
