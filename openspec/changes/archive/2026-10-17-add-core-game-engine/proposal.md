## Why

There is no digital, table-like way to play Arkham Horror: The Card Game in the browser with full rules automation. The project is empty, but `inspired/` provides rules (Learn to Play PDF), data pipelines (`arkham-investigator-data`, `arkham-divider-data`) and a companion app to borrow from. We need a rules engine plus a Hearthstone-style 3D table so that 1–4 local players can play the Night of the Zealot campaign, and so new campaigns/cards can be added by dropping data files instead of writing engine code.

## What Changes

- New Vite + TypeScript + React + react-three-fiber web app (greenfield).
- **Core engine** (pure TS, no rendering deps): deterministic game state, seeded RNG, action/event log, Mythos → Investigation → Enemy → Upkeep rounds, 3 actions per turn (investigate, move, draw, resource, play, activate, fight, engage, evade), skill tests with chaos bag, damage/horror and defeat, enemies (hunter, retaliate, aloof, engagement, attacks of opportunity), locations (shroud, clues, connections, revealed/unrevealed), act/agenda decks with doom and clue thresholds, treachery/encounter deck, weaknesses, resolutions.
- **Card effect system**: cards declare stats in JSON; behavior via a small library of typed, data-driven effects/triggers, with a TS escape hatch (`effects/<code>.ts`) for unique cards.
- **Content as files**: `content/` directory with cards, encounter sets, scenarios, campaigns, investigators, starter decks, chaos bag per difficulty, and i18n string overrides. Adding a campaign = adding a folder.
- **Data import script**: pulls card stats/text/images metadata from ArkhamDB public API (and investigator/encounter-set metadata compatible with `arkham-investigator-data` / `arkham-divider-data`) into `content/`, so we don't hand-type card stats.
- **Campaign system**: campaign log, scenario sequence, resolutions, XP, trauma, setup steps described in data.
- **First campaign**: Night of the Zealot (The Gathering, The Midnight Masks, The Devourer Below), Easy/Standard difficulty.
- **Investigator decks**: the five core investigators (Roland Banks, Daisy Walker, "Skids" O'Toole, Agnes Baker, Wendy Adams) with core-set starter decks from the Learn to Play guide.
- **3D table UI**: top-down camera, each player's area (investigator card, hand, play area, deck/discard, resources/clues), shared map of locations, act/agenda/encounter deck, chaos bag reveal animation, HTML HUD for prompts/choices; local hot-seat turn handoff.
- English card text with an i18n layer ready for Russian.

Non-goals: online multiplayer, deckbuilding editor UI, XP upgrade shop UI beyond a basic list, Hard/Expert difficulty, campaigns beyond Night of the Zealot, AI opponents, mobile layout.

## Capabilities

### New Capabilities

- `game-engine`: rules engine — state model, round/phase flow, actions, skill tests, chaos bag, damage/horror, enemies, locations, act/agenda, encounter deck, win/lose, determinism.
- `card-content`: on-disk content format for cards, encounter sets, investigators, decks, scenarios, campaigns and i18n; validation, loading, ArkhamDB import; data-driven card effects.
- `campaign-play`: campaign definitions, scenario setup from data, resolutions, campaign log, XP/trauma, Night of the Zealot content.
- `investigator-decks`: investigator definitions, deck lists, deck validation, signature cards/weaknesses, the five core starter decks.
- `game-table-ui`: react-three-fiber top-down table, player areas, location map, card interactions, chaos bag reveal, HUD prompts, hot-seat flow.

### Modified Capabilities

<!-- none: no existing specs -->

## Impact

- New repo code: `src/engine`, `src/content-loader`, `src/ui`, `content/`, `scripts/import-arkhamdb.ts`.
- Dependencies: react, react-dom, three, @react-three/fiber, @react-three/drei, zod (content validation), vitest; dev: vite, typescript, tsx.
- External data, import time only: ArkhamDB public API (`/api/public/cards/`) or arkham.build card cache (`api.arkham.build/v1/cache/cards/{lang}`) for card stats/text; ArkhamDivider `core.json` (neizerth.github.io/ArkhamDividerData) for campaign/scenario/encounter-set metadata; ArkhamInvestigatorData `<locale>.json` for signatures and scenario reference cards. Runtime: card images from `cdn.arkham.build/optimized/<code>.webp`, investigator portraits from neizerth.github.io/ArkhamInvestigatorData (not bundled). Card art is FFG copyright — personal use; check licensing (InvestigatorData/DividerData have no LICENSE file) before any public release.
- `inspired/` remains read-only reference; nothing in it is imported at runtime.
