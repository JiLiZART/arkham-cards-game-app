## 1. Project setup

- [x] 1.1 Scaffold Vite + React + TS app, add three, @react-three/fiber, @react-three/drei, zustand, immer, zod, vitest, tsx; verify `npm run dev` shows a blank R3F canvas and `npm test` runs
- [x] 1.2 Create folder layout (`content/`, `scripts/`, `src/engine`, `src/content`, `src/ui`) and ESLint `no-restricted-imports` keeping `src/engine` free of react/three/ui; verify lint fails on a deliberate bad import

## 2. Content schema, loader, import

- [x] 2.1 Write zod schemas for card, ability/effect vocabulary, investigator, deck, scenario, campaign, i18n; verify schema unit tests accept a sample of each and reject an unknown effect key
- [x] 2.2 Implement `scripts/import-cards.ts --pack core` (ArkhamDB `/api/public/cards/?encounter=1` → `content/packs/core/cards.generated.json`); verify it writes all core player + encounter cards and re-running leaves `cards.json` overrides untouched
- [x] 2.3 Implement loader (`import.meta.glob` + Node fs variant for tests) merging generated + overrides by code; verify Ghoul Priest record exposes fight/health/evade/damage/horror/Hunter/Retaliate/victory
- [x] 2.4 Implement `scripts/check-content.ts` (schema + dangling refs: card codes, encounter sets, locations, scenarios); verify a deck with code `01999` fails with file + code in the message
- [x] 2.5 Implement i18n resolver with English fallback and `en`/`ru` folders; verify missing RU name falls back to EN
- [x] 2.6 Implement card image URL resolver (cdn.arkham.build front/back) and canvas text-face fallback generator; verify fallback texture renders name/cost/icons for a card with a broken URL

## 3. Engine foundation

- [x] 3.1 Define `GameState`, card instances/zones, seeded RNG (mulberry32) and shuffle; verify same seed → same shuffle test
- [x] 3.2 Implement step queue, `dispatch`, `pendingChoice`, event log, error-without-mutation; verify illegal action leaves state reference-equal and returns error
- [x] 3.3 Implement `getLegalActions`; verify it lists basic actions/playable cards/abilities for a sample state
- [x] 3.4 Implement JSON (de)serialization + `replay(seed, setup, actions)`; verify save/load round-trip and replay determinism tests

## 4. Core rules

- [x] 4.1 Round structure: Mythos (skip round 1) / Investigation (player order choice, 3 actions) / Enemy / Upkeep (ready, draw, resource, hand size 8); verify spec scenarios "first round skips mythos" and "upkeep hand size"
- [x] 4.2 Chaos bag: build per difficulty, draw/return/seal/add/remove, symbol tokens via scenario reference values (written fresh after reviewing `inspired/ArkhamInvestigator`; no code copied); verify skull-in-Gathering test
- [x] 4.3 Skill tests: value, commit window (matching + wild icons), reveal, modifiers, autofail, floor 0, elder sign hook, results, discard committed; verify investigate-success, auto-fail and committed-icons tests
- [x] 4.4 Basic actions: investigate, move (reveal + engaged enemies follow), draw, resource, play, activate, fight, engage, evade, resign; attacks of opportunity; verify AoO and move tests
- [x] 4.5 Locations: shroud, per-investigator clues, connections, reveal; verify per-investigator clue test
- [x] 4.6 Enemies: spawn, engagement, exhaust, damage/defeat, victory display, Hunter (shortest path), Retaliate, Aloof, Alert, Massive, Prey, enemy-phase attacks; verify hunter and retaliate tests
- [x] 4.7 Damage/horror assignment to investigator/assets, defeat, trauma, cards leave play, clues drop, all-defeated ends scenario; verify Daisy-defeated test
- [x] 4.8 Act/agenda: doom threshold check, flip and resolve back, group clue spend, objective-based advance; verify agenda-advance and group-clue-spend tests
- [x] 4.9 Encounter deck: build from sets, draw/resolve revelation, Surge, Peril, threat area/location attachment, reshuffle when empty; verify empty-deck test
- [x] 4.10 Player cards: slots and slot replacement, uses, fast, exhaust/ready, weaknesses on draw; timing windows with forced/reaction/free abilities and limits; verify slot-limit and weakness-drawn tests

## 5. Effect DSL

- [x] 5.1 Implement effect vocabulary → steps (dealDamage, dealHorror, heal, gainResources, drawCards, discoverClue, placeDoom, removeDoom, modifySkill, spawnEnemy, moveTo, search, addToken, chooseOne, testSkill, …) and constant modifiers; verify Emergency Cache gives 3 resources with no script
- [x] 5.2 Implement script registry (`content/**/scripts/<code>.ts` via glob); verify a `script: true` test card runs its script

## 6. Investigators and decks

- [x] 6.1 Import + author 5 core investigators (stats, abilities, elder sign, deckbuilding, signatures/weaknesses); verify Roland stats test
- [x] 6.2 Author abilities/overrides for all cards in the 5 core starter decks + basic weaknesses; verify `check:content` passes
- [x] 6.3 Author 5 starter deck files from the Learn to Play lists; verify each passes deck validation
- [x] 6.4 Deck validation (size, access, copies, signatures) and ArkhamDB deck JSON import; verify too-many-copies test and import of a sample export
- [x] 6.5 Scenario start for investigators: random basic weakness at campaign start, shuffle, 5 resources, 5 cards with weakness redraw, mulligan; verify weakness-in-opening-hand test

## 7. Night of the Zealot

- [x] 7.1 Campaign model: start campaign, log, XP (victory + bonus), trauma carry-over, killed/insane; verify XP-award test
- [x] 7.2 Scenario setup + resolution interpreter (predicates on log, campaign effects recordLog/addXp/addCardToDeck/nextScenario); verify log-dependent Midnight Masks setup test
- [x] 7.3 The Gathering: scenario JSON, encounter sets, act/agenda, reference card Easy/Standard, scripts for unique cards; verify Gathering setup test + seeded scripted playthrough reaching Resolution 1
- [x] 7.4 The Midnight Masks: scenario JSON, cultist mechanics, scripts; verify seeded playthrough reaches a resolution
- [x] 7.5 The Devourer Below: scenario JSON, Umôrdhoth, scripts; verify seeded playthrough reaches a resolution and the campaign summary
- [x] 7.6 Persistence in localStorage with `engineVersion`; verify reload mid-scenario resumes identical state (unit test on store + manual check)

## 8. 3D table UI

- [x] 8.1 Zustand store bridging engine (`dispatch`, event queue, `viewerId`); verify UI dispatch updates state in a component test
- [x] 8.2 Table scene: top-down camera, felt/table, pure `layout(state, viewerId)` for scenario area, location map with connections, up to 4 player areas, fanned hand; verify layout unit test (no overlaps for 4 players) and visual check
- [x] 8.3 `CardMesh` with texture cache, back faces, fallback face, damped movement to layout target, tokens (damage/horror/clues/doom/resources); verify visually with a debug state
- [x] 8.4 Interactions: hover zoom, click/drag to play, location/enemy/ability targets, legal-only highlighting; verify drag-to-play and illegal-target scenarios manually
- [x] 8.5 HUD: prompts for every `pendingChoice`, skill test panel with commit window and calculation, chaos token pop animation; verify skill test display scenario manually
- [x] 8.6 Event-driven animations (encounter draw flip, damage numbers) and input gating; verify encounter draw scenario manually
- [x] 8.7 Hot-seat: viewer switching, "Pass to <player>" screen with privacy toggle; verify turn handoff scenario manually
- [x] 8.8 Menus: new campaign (campaign, difficulty, investigators, decks), continue, campaign log between scenarios, language select; verify continue-game scenario manually
- [x] 8.9 Debug panel: seed, state JSON, action log download/upload replay; verify an uploaded log reproduces the game

## 9. Integration & performance

- [x] 9.1 Play The Gathering end to end with 2 investigators in the browser; record any rules gaps as tasks
- [x] 9.2 Play full Night of the Zealot campaign with 1 and 4 investigators; verify campaign summary shows log, XP, trauma
- [ ] 9.3 Profile 4-player Devourer Below table; verify ≥50 fps on integrated GPU (Chrome DevTools performance trace)

## Known gaps found while playtesting (follow-ups, not part of this change)

- Midnight Masks map and Devourer Below woods/Ritual Site connections are approximations (ArkhamDB has no connection data); fix in the scenario JSON once verified against the printed cards.
- Hard/Expert chaos token effects are not authored (Easy/Standard only, per proposal non-goals).
- Scrying shows the top 3 cards but does not let you reorder them.
- Prey ties pick the first tied investigator in player order instead of letting the lead choose.
- "Earn Lita Chantler" when the lead was killed (R3 branch) goes to the new lead instead of a chosen investigator.
- No XP spending / deck upgrade screen (proposal non-goal); higher-level core cards have no behavior authored yet.
- The bundled bot is only a test driver: it rarely wins, so it is not a balance signal.
