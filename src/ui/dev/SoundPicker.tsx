/**
 * Dev-only sound picker (ADR-0010), opened from the Debug panel under `vite`: every sound slot with where it plays, the
 * clip it uses now and its five CC0 candidates, all played through the game's own audio engine at the level they ship
 * at. Choosing posts to the dev server, which rewrites content/sounds/sounds.json and converts the file.
 */
import { useEffect, useMemo, useState } from "react";
import type { SoundCandidates, SoundManifest } from "../../content/schema";
import { clipAt } from "../../content/soundChoose";
import { slotsOf } from "../../content/soundSlots";
import { audio } from "../audio";
import { asset } from "../images";
import { db } from "../context";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const GROUPS = [
  ["all", "All"],
  ["event", "Events"],
  ["moment", "Moments"],
  ["card", "Cards and traits"],
  ["music", "Music"],
] as const;
type Group = (typeof GROUPS)[number][0];
/** how much of a music track is played when auditioning */
const EXCERPT = 10;

const inGroup = (slot: string, g: Group) => g === "all" || slot.startsWith(`${g}:`) || (g === "card" && slot.startsWith("trait:"));

export default function SoundPicker({ onClose }: { onClose: () => void }) {
  const [cands, setCands] = useState<SoundCandidates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manifest, setManifest] = useState<SoundManifest>(db.sounds);
  const [group, setGroup] = useState<Group>("all");
  const [query, setQuery] = useState("");
  /** the candidate marked in each slot, waiting to be used */
  const [marked, setMarked] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch(`${BASE}/__sounds/candidates`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`the dev server answered ${r.status}`))))
      .then(setCands)
      .catch((e: Error) => setError(`${e.message}. Run npm run import:sounds -- --candidates and start npm run dev.`));
    return () => audio.stopAudition();
  }, []);

  const slots = useMemo(() => Object.entries(cands?.slots ?? {}).filter(([id, s]) => inGroup(id, group) && `${id} ${s.where}`.toLowerCase().includes(query.toLowerCase())), [cands, group, query]);

  const playCurrent = (slot: string, music: boolean) => {
    const id = clipAt(manifest, slot);
    if (!id || id === "none") return;
    if (music) {
      const t = manifest.music[id];
      void audio.audition(asset(`sounds/${t.file}.${document.createElement("audio").canPlayType('audio/mp4; codecs="mp4a.40.2"') ? "m4a" : "webm"}`), "music", t.gain, t.loopStart ?? 0, EXCERPT);
    } else {
      const c = manifest.effects[id];
      void audio.audition(asset(`sounds/${c.file}`), "effects", c.gain);
    }
  };
  const playCandidate = (preview: string, music: boolean) => void audio.audition(`${BASE}/__sounds-src/${preview}`, music ? "music" : "effects", 1, 0, music ? EXCERPT : undefined);

  const choose = async (slot: string, candidate: number | "none" | "current") => {
    setBusy(slot);
    setNote((n) => ({ ...n, [slot]: "" }));
    try {
      const r = await fetch(`${BASE}/__sounds/choose`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slot, candidate }) });
      const body = (await r.json()) as { manifest?: SoundManifest; error?: string };
      if (!r.ok || !body.manifest) throw new Error(body.error ?? `the dev server answered ${r.status}`);
      // the live game uses the new manifest from now on; the rewritten files are fetched afresh
      (db as { sounds: SoundManifest }).sounds = body.manifest;
      audio.forget(Object.values(body.manifest.effects).map((c) => c.file), Object.values(body.manifest.music).map((t) => t.file));
      setManifest(body.manifest);
      setMarked((m) => Object.fromEntries(Object.entries(m).filter(([k]) => k !== slot)));
      setNote((n) => ({ ...n, [slot]: candidate === "none" ? "silenced" : `saved as ${clipAt(body.manifest as SoundManifest, slot) ?? "(nothing)"}` }));
    } catch (e) {
      setNote((n) => ({ ...n, [slot]: (e as Error).message }));
    } finally {
      setBusy(null);
    }
  };

  const unused = useMemo(() => slotsOf(manifest).filter((s) => cands && !cands.slots[s]), [manifest, cands]);

  return (
    <div className="sound-picker" role="dialog" aria-label="Sounds">
      <div className="sp-head">
        <h2>Sounds</h2>
        <div className="sp-tabs">
          {GROUPS.map(([g, label]) => (
            <button key={g} className={group === g ? "primary" : ""} onClick={() => setGroup(g)}>
              {label}
            </button>
          ))}
        </div>
        <input placeholder="Search a slot" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search a slot" />
        <span className="sp-count">{slots.length} slots</span>
        <button onClick={onClose}>Close</button>
      </div>
      {error && <div className="problems">{error}</div>}
      {unused.length > 0 && <div className="problems">Slots in the manifest with no candidates: {unused.join(", ")}</div>}
      <div className="sp-list">
        {slots.map(([slot, s]) => {
          const music = s.kind === "music";
          const now = clipAt(manifest, slot);
          const clip = !now || now === "none" ? null : music ? manifest.music[now] : manifest.effects[now];
          return (
            <div key={slot} className="sp-slot">
              <div className="sp-name">
                <code>{slot}</code>
                <span>{s.where}</span>
              </div>
              <div className="sp-options">
                <button disabled={!clip} onClick={() => playCurrent(slot, music)} title={clip ? `${clip.author} · ${clip.source}` : "no sound now"}>
                  ▶ Now{now === "none" ? ": none" : clip ? `: ${now}` : ": none"}
                </button>
                {s.candidates.map((c, i) => (
                  <button
                    key={c.preview}
                    className={marked[slot] === i ? "primary" : ""}
                    onClick={() => {
                      setMarked((m) => ({ ...m, [slot]: i }));
                      playCandidate(c.preview, music);
                    }}
                    title={`${c.description}\n${c.author} · ${c.source}${c.seam !== undefined ? `\nloop seam ${c.seam} dB` : ""}`}
                  >
                    ▶ {i + 1}
                    {c.seam !== undefined && <small className={c.seam > 6 ? "sp-bad" : ""}> {c.seam} dB</small>}
                  </button>
                ))}
                <button className="primary" disabled={busy === slot || marked[slot] === undefined} onClick={() => choose(slot, marked[slot])}>
                  Use {marked[slot] === undefined ? "" : marked[slot] + 1}
                </button>
                {!music && (
                  <button disabled={busy === slot} onClick={() => choose(slot, "none")}>
                    No sound
                  </button>
                )}
                {note[slot] && <span className="sp-note">{note[slot]}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
