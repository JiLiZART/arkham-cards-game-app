/**
 * Dev-only sound picker (ADR-0010), opened from the Debug panel under `vite`: every sound slot with where it plays, the
 * clip it uses now and its candidates, all played through the game's own audio engine at the level they ship at. A tap
 * plays a sound and marks it as the slot's choice ("Now" keeps the current one, "No sound" silences the slot); the marks
 * are kept in this browser until every slot has one, and Apply sends them all to the dev server, which rewrites
 * content/sounds/sounds.json and converts the files.
 */
import { useEffect, useMemo, useState } from "react";
import type { SoundCandidates, SoundManifest } from "../../content/schema";
import { clipAt } from "../../content/soundChoose";
import { audio } from "../assets/audio";
import { asset } from "../assets/images";
import { db } from "../state/context";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const GROUPS = [
  ["all", "All"],
  ["event", "Events"],
  ["moment", "Moments"],
  ["card", "Cards and traits"],
  ["music", "Music"],
] as const;
type Group = (typeof GROUPS)[number][0];
type Mark = number | "none" | "current";
/** how much of a music track is played when auditioning */
const EXCERPT = 10;
const STORE = "ah:soundPicks";

const inGroup = (slot: string, g: Group) =>
  g === "all" || slot.startsWith(`${g}:`) || (g === "card" && slot.startsWith("trait:"));

function loadMarks(): Record<string, Mark> {
  try {
    return JSON.parse(localStorage.getItem(STORE) ?? "{}") as Record<string, Mark>;
  } catch {
    return {};
  }
}
function saveMarks(m: Record<string, Mark>) {
  try {
    localStorage.setItem(STORE, JSON.stringify(m));
  } catch {
    // marks are a convenience; a refused storage only loses them on reload
  }
}

export default function SoundPicker({ onClose }: { onClose: () => void }) {
  const [cands, setCands] = useState<SoundCandidates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manifest, setManifest] = useState<SoundManifest>(db.sounds);
  const [group, setGroup] = useState<Group>("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [marks, setMarks] = useState<Record<string, Mark>>(loadMarks);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${BASE}/__sounds/candidates`)
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(`the dev server answered ${r.status}`)),
      )
      .then((c: SoundCandidates) => {
        setCands(c);
        // marks for slots that no longer exist, or past a shortened list, are dropped
        setMarks((m) =>
          Object.fromEntries(
            Object.entries(m).filter(
              ([k, v]) => c.slots[k] && (typeof v !== "number" || v < c.slots[k].candidates.length),
            ),
          ),
        );
      })
      .catch((e: Error) =>
        setError(`${e.message}. Run npm run import:sounds -- --candidates and start npm run dev.`),
      );
    return () => audio.stopAudition();
  }, []);
  useEffect(() => saveMarks(marks), [marks]);

  const all = Object.keys(cands?.slots ?? {});
  const left = all.filter((s) => marks[s] === undefined);
  const slots = useMemo(
    () =>
      Object.entries(cands?.slots ?? {}).filter(
        ([id, s]) =>
          inGroup(id, group) &&
          (!open || marks[id] === undefined) &&
          `${id} ${s.where}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [cands, group, query, open, marks],
  );
  const mark = (slot: string, m: Mark) => setMarks((x) => ({ ...x, [slot]: m }));

  const playCurrent = (slot: string, music: boolean) => {
    const id = clipAt(manifest, slot);
    if (!id || id === "none") return audio.stopAudition();
    if (music) {
      const t = manifest.music[id];
      void audio.audition(
        asset(
          `sounds/${t.file}.${document.createElement("audio").canPlayType('audio/mp4; codecs="mp4a.40.2"') ? "m4a" : "webm"}`,
        ),
        "music",
        t.gain,
        t.loopStart ?? 0,
        EXCERPT,
      );
    } else {
      const c = manifest.effects[id];
      void audio.audition(asset(`sounds/${c.file}`), "effects", c.gain);
    }
  };
  const playCandidate = (preview: string, music: boolean) =>
    void audio.audition(
      `${BASE}/__sounds-src/${preview}`,
      music ? "music" : "effects",
      1,
      0,
      music ? EXCERPT : undefined,
    );

  const apply = async () => {
    setApplying(true);
    setResult(null);
    audio.stopAudition();
    try {
      const choices = Object.entries(marks).map(([slot, candidate]) => ({ slot, candidate }));
      const r = await fetch(`${BASE}/__sounds/choose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choices }),
      });
      const body = (await r.json()) as {
        manifest?: SoundManifest;
        imported?: string[];
        error?: string;
      };
      if (!r.ok || !body.manifest)
        throw new Error(body.error ?? `the dev server answered ${r.status}`);
      // the live game uses the new manifest from now on; the rewritten files are fetched afresh
      (db as { sounds: SoundManifest }).sounds = body.manifest;
      audio.forget(
        Object.values(body.manifest.effects).map((c) => c.file),
        Object.values(body.manifest.music).map((t) => t.file),
      );
      setManifest(body.manifest);
      setMarks({});
      setResult(`Applied: ${body.imported?.length ?? 0} files converted, sounds.json rewritten.`);
    } catch (e) {
      setResult(`Not applied: ${(e as Error).message}`);
    } finally {
      setApplying(false);
    }
  };

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
        <input
          placeholder="Search a slot"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search a slot"
        />
        <label className="sp-open">
          <input type="checkbox" checked={open} onChange={(e) => setOpen(e.target.checked)} /> Not
          chosen yet
        </label>
        <span className="sp-count">
          {all.length - left.length} / {all.length} chosen
        </span>
        <button
          className="primary"
          disabled={applying || !all.length || left.length > 0}
          onClick={apply}
          title={
            left.length
              ? `Still to choose: ${left.join(", ")}`
              : "Write every choice to sounds.json and convert the files"
          }
        >
          {applying ? "Applying…" : left.length ? `Apply (${left.length} left)` : "Apply all"}
        </button>
        <button onClick={onClose}>Close</button>
      </div>
      {error && <div className="problems">{error}</div>}
      {result && <div className="sp-result">{result}</div>}
      <div className="sp-list">
        {slots.map(([slot, s]) => {
          const music = s.kind === "music";
          const now = clipAt(manifest, slot);
          const clip =
            !now || now === "none" ? null : music ? manifest.music[now] : manifest.effects[now];
          const m = marks[slot];
          return (
            <div key={slot} className={`sp-slot ${m !== undefined ? "chosen" : ""}`}>
              <div className="sp-name">
                <code>{slot}</code>
                <span>{s.where}</span>
              </div>
              <div className="sp-options">
                <button
                  className={m === "current" ? "primary" : ""}
                  onClick={() => {
                    mark(slot, "current");
                    playCurrent(slot, music);
                  }}
                  title={
                    clip
                      ? `keep the current sound\n${clip.author} · ${clip.source}`
                      : "keep it silent, as it is now"
                  }
                >
                  ▶ Now{clip ? `: ${now}` : ": none"}
                </button>
                {s.candidates.map((c, i) => (
                  <button
                    key={c.preview}
                    className={m === i ? "primary" : ""}
                    onClick={() => {
                      mark(slot, i);
                      playCandidate(c.preview, music);
                    }}
                    title={`${c.description}\n${c.author} · ${c.source}${c.seam !== undefined ? `\nloop seam ${c.seam} dB` : ""}`}
                  >
                    ▶ {i + 1}
                    {c.seam !== undefined && (
                      <small className={c.seam > 6 ? "sp-bad" : ""}> {c.seam} dB</small>
                    )}
                  </button>
                ))}
                {!music && (
                  <button
                    className={m === "none" ? "primary" : ""}
                    onClick={() => {
                      mark(slot, "none");
                      audio.stopAudition();
                    }}
                  >
                    No sound
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
