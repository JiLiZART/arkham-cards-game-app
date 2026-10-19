import { type SoundCandidates, SoundManifest } from "./schema";

export type Choice = { slot: string; candidate: number | "none" | "current" };
export type Chosen = {
  manifest: SoundManifest;
  /** the manifest keys (clip or track ids) whose files the importer must write */
  importIds: string[];
  /** converted files under public/sounds that no clip uses any more */
  removedFiles: string[];
};

/** an effect trimmed to what the preview played; a track to the length the preview covers */
const EFFECT_TRIM: [number, number] = [0, 4];
const TRACK_TRIM: [number, number] = [0, 300];

/** the clip id a slot's chosen sound gets: stable, so choosing again for the slot replaces the same clip */
export const clipIdOf = (slot: string) => slot.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");

type Ref = { get(): string | null; set(id: string | null): void };

/** where in the manifest a slot's clip id lives (null id = no entry) */
function refOf(m: SoundManifest, slot: string): Ref {
  const [kind, ...rest] = slot.split(":");
  const key = rest.join(":");
  if (kind === "moment") return { get: () => m.moments[key] ?? null, set: (id) => void (id === null ? delete m.moments[key] : (m.moments[key] = id)) };
  if (kind === "event") {
    const layered = key.match(/^(.*)\.(\d+)$/);
    if (layered) {
      const [, name, i] = layered;
      const at = Number(i);
      const list = () => (Array.isArray(m.events[name]) ? (m.events[name] as string[]) : m.events[name] ? [m.events[name] as string] : []);
      return {
        get: () => list()[at] ?? null,
        set: (id) => {
          const next = list();
          if (id === null) next.splice(at, 1);
          else next[at] = id;
          if (next.length) m.events[name] = next;
          else delete m.events[name];
        },
      };
    }
    return { get: () => (typeof m.events[key] === "string" ? (m.events[key] as string) : null), set: (id) => void (id === null ? delete m.events[key] : (m.events[key] = id)) };
  }
  if (kind === "trait") {
    const [when, trait] = [key.split(":")[0], key.split(":").slice(1).join(":")];
    const by = () => ((m.traits as Record<string, Record<string, string>>)[when] ??= {});
    return { get: () => by()[trait] ?? null, set: (id) => void (id === null ? delete by()[trait] : (by()[trait] = id)) };
  }
  if (kind === "card") {
    const [code, when] = [key.split(":")[0], key.split(":")[1]];
    const by = () => ((m.cards as Record<string, Record<string, string>>)[code] ??= {});
    return { get: () => by()[when] ?? null, set: (id) => void (id === null ? delete by()[when] : (by()[when] = id)) };
  }
  throw new Error(`unknown sound slot ${slot}`);
}

/** every effect id the manifest refers to */
function used(m: SoundManifest): Set<string> {
  const ids = new Set<string>();
  for (const v of Object.values(m.events)) for (const id of Array.isArray(v) ? v : [v]) ids.add(id);
  for (const id of Object.values(m.moments)) ids.add(id);
  for (const by of Object.values(m.traits)) for (const id of Object.values(by)) ids.add(id);
  for (const by of Object.values(m.cards)) for (const id of Object.values(by)) ids.add(id);
  return ids;
}

/**
 * What choosing a candidate (or none, or keeping the current) for a slot does to the manifest: the slot points at a new
 * clip carrying the candidate's provenance and original, a clip nothing uses any more is dropped, and the result is
 * validated. The dev server (ADR-0010) writes it, runs the importer for `importIds` and deletes `removedFiles`.
 */
export function chooseSound(current: SoundManifest, candidates: SoundCandidates, choice: Choice): Chosen {
  const slot = candidates.slots[choice.slot];
  if (!slot) throw new Error(`no candidates for slot ${choice.slot}`);
  const m: SoundManifest = structuredClone(current);
  if (choice.candidate === "current") return { manifest: m, importIds: [], removedFiles: [] };

  if (slot.kind === "music") {
    const key = choice.slot.slice("music:".length);
    if (choice.candidate === "none") throw new Error("a music track can't be set to none; pick a candidate");
    const c = slot.candidates[choice.candidate];
    if (!c) throw new Error(`candidate ${choice.candidate} out of range`);
    if (c.license !== "CC0") throw new Error(`candidate ${choice.candidate} is not CC0`);
    const old = m.music[key];
    const file = `music-${clipIdOf(key)}`;
    m.music[key] = { file, gain: 1, loop: true, source: c.source, author: c.author, license: "CC0", original: c.original, trim: TRACK_TRIM };
    // the old stem goes unless another role still uses it
    const stale = old && old.file !== file && !Object.entries(m.music).some(([k, t]) => k !== key && t.file === old.file) ? [`${old.file}.m4a`, `${old.file}.webm`] : [];
    return { manifest: SoundManifest.parse(m), importIds: [key], removedFiles: stale };
  }

  const ref = refOf(m, choice.slot);
  const before = ref.get();
  let importIds: string[] = [];
  if (choice.candidate === "none") {
    if (choice.slot.startsWith("moment:")) ref.set("none");
    else ref.set(null);
  } else {
    const c = slot.candidates[choice.candidate];
    if (!c) throw new Error(`candidate ${choice.candidate} out of range`);
    if (c.license !== "CC0") throw new Error(`candidate ${choice.candidate} is not CC0`);
    const id = clipIdOf(choice.slot);
    m.effects[id] = { file: `${id}.mp3`, gain: 1, source: c.source, author: c.author, license: "CC0", original: c.original, trim: EFFECT_TRIM };
    ref.set(id);
    importIds = [id];
  }
  const keep = used(m);
  const removedFiles: string[] = [];
  if (before && before !== "none" && !keep.has(before) && m.effects[before]) {
    removedFiles.push(m.effects[before].file);
    delete m.effects[before];
  }
  return { manifest: SoundManifest.parse(m), importIds, removedFiles };
}

/**
 * Every slot's choice at once (the picker's Apply): the last choice for a slot wins, each new clip is imported once, and
 * only the files the final manifest no longer uses are removed. One wrong choice refuses the batch.
 */
export function chooseSounds(current: SoundManifest, candidates: SoundCandidates, choices: Choice[]): Chosen {
  const last = new Map(choices.map((c) => [c.slot, c]));
  let m = current;
  const importIds = new Set<string>();
  const removed = new Set<string>();
  for (const c of last.values()) {
    const r = chooseSound(m, candidates, c);
    m = r.manifest;
    r.importIds.forEach((id) => importIds.add(id));
    r.removedFiles.forEach((f) => removed.add(f));
  }
  const kept = new Set([...Object.values(m.effects).map((c) => c.file), ...Object.values(m.music).flatMap((t) => [`${t.file}.m4a`, `${t.file}.webm`])]);
  return { manifest: m, importIds: [...importIds], removedFiles: [...removed].filter((f) => !kept.has(f)) };
}

/** the clip (or, for music, the track) a slot uses now, or null when it has none; "none" for a silenced moment */
export function clipAt(m: SoundManifest, slot: string): string | null {
  if (slot.startsWith("music:")) {
    const key = slot.slice("music:".length);
    return m.music[key] ? key : null;
  }
  return refOf(structuredClone(m), slot).get();
}
