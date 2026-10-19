## 1. Loudness

- [x] 1.1 `import-sounds.ts`: two-pass `loudnorm` per effect (−18 LUFS, −1 dBTP, LRA 7, short clips padded for the measurement) and per track (−23 LUFS); `encodeArgs` tests for the filter chain; `gain` schema tightened to 0.5–1.5 and today's gains reset to 1.
- [x] 1.2 `check:content`: integrated loudness of every converted effect (ffmpeg `ebur128`) within 2 LU of target, peak under −1 dBTP; the loop seam of every track (RMS at loop start and end within 6 dB); a plain warning and skipped checks when ffmpeg is missing; budgets 1.5 MB / 12 MB; tests on fixtures.
- [x] 1.3 Re-import every current clip and track; measure; commit the rewritten `public/sounds/`.

## 2. Candidates

- [x] 2.1 `scripts/sound-candidates.ts`: the slot list (every event and variant, moment, trait and card sound, music role) and five CC0 sources each with pack URL, file (or freesound id), author, description; `import:sounds -- --candidates` downloads packs once into `sounds-src/packs/`, extracts to `sounds-src/candidates/<slot>/`, renders normalised previews, writes `content/sounds/candidates.json` with provenance and sha256; a missing source is reported and the slot filled from the packs; tests for the list's shape (five per slot, CC0 only) and the download's idempotence on a fixture.
- [x] 2.2 Schema for `candidates.json` and its checks (every slot of the manifest present, five entries, CC0, originals listed); `candidates.json` committed, `sounds-src/` stays ignored.

## 3. Picker

- [x] 3.1 Vite dev middleware in `vite.config.ts`: `GET /__sounds-src/*` serves `sounds-src/candidates/`; `POST /__sounds/choose` validates `{ slot, candidate | "none" | "current" }` against `candidates.json`, moves the provenance into `sounds.json`, validates with `SoundManifest`, runs the importer for that clip, answers with the new entry; localhost only; tests for the handler as a pure function.
- [x] 3.2 `src/ui/dev/SoundPicker.tsx` (lazy, DEV only) from a Sounds button in the Debug panel: every slot with where it plays, the current clip, five candidates and "no sound"; play through `audio.play` at `gainOf(...)` (music: a 10 s excerpt from the loop start); Choose posts and reloads the manifest; the seam measurement shown per music candidate; a test that the picker is absent from the production build (grep the dist).
- [x] 3.4 (asked for during the change) Twelve candidates per slot (the file accepts 10 to 15); the picker marks a choice per slot (kept in the browser), Apply is offered once every slot has one and sends them all (`chooseSounds`, `{ choices }`), and the page is not reloaded while the Apply writes.
- [ ] 3.3 Session with the user: pick a clip for every slot in the picker (the user's choices), commit the resulting `sounds.json` and files.

## 4. More moments

- [x] 4.1 `sounds.ts`: `MOMENTS` list, `"none"` accepted by the schema and `momentClip`, a 60 ms debounce per name in `moment()`; manifest entries for the new moments and for `enemyDamage` and `weakness`; content check: every manifest moment is in the list and every list entry has a value; tests.
- [x] 4.2 Call sites: move (marker landing), reveal (with the flip), deck tap (`Pile`), bag landing and token clatter scaled by count (`DrawStage`), token pick, avatar choice and the automatic pick (`InvestigatorChoiceOverlay`), countdown close (`PhasePause`), cancel (`SkillTestScreen`), builder add/remove/replace (`DeckEditArea`), tabs (`Catalog`, `DecksStep`), open/close (`Modal`, `Drawer`), screen change (`App`), turn title, victory (`ScenarioEnd`), resource/heal/evade/engage/discard from `ActionFloats`; `sounds.test.ts` covers the routing.

## 5. Verification

- [ ] 5.1 Browser: a round with every new moment heard once and the levels even (the audio log shows each clip once per occurrence); the picker chooses a clip for "draw" and the next draw plays it; `npm test`, lint, build, content check; the production `dist` has no picker and no candidate files; drive-calm to round 3 with 0 errors.
- [ ] 5.2 README (sound section, credits regenerated from the manifest, ffmpeg note, the picker under `npm run dev`); `openspec validate sound-rework --type change --strict`.
