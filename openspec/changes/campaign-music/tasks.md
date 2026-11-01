## 1. Content rules

- [x] 1.1 Schema: `license` CC0 | own | provided, `source` required only for CC0; `checkCandidates` skips non-CC0 slots; music budget 50 MB; credits list own and provided clips. Tests first.

## 2. Music selection

- [x] 2.1 `musicFor`: `card:<agenda>` then `card:<act>` before the bed, `tension:<scenario>` before `tension`, the `:alt` take by the seed. Tests first.
- [x] 2.2 `menuMusic` and the menu track in `App` on every screen but the table.
- [x] 2.3 `audio.ts`: a non-looping track crossfades into its other take (`MusicFiles.next`) before it ends, scheduled in context time.
- [x] 2.4 A track's `silent` flag: kept in the manifest, never chosen by `musicFor`; the shared tension track is silent.

## 3. Content

- [x] 3.1 Manifest entries for the menu, fight, Gathering act and Midnight Masks agenda/tension tracks with their alternates, and three effects (attack, horror, spawn generic and Monster); originals in `sounds-src/own/`; `pnpm import:sounds` for the new ids; README credits.

## 4. Verification

- [x] 4.1 Browser check: menu theme on the menu; the chapter track at the table; fight on engagement and back on defeat; menu again after leaving.
- [x] 4.2 `pnpm typecheck`, lint, tests, `pnpm check:content`, `openspec validate campaign-music --type change --strict`.
