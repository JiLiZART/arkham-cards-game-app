## Context

Greenfield repo; only `openspec/` and `inspired/` exist. `inspired/` gives us:
- `AHC01_Learn_to_Play_RU_2020_1.pdf` — core rules reference.
- `ArkhamInvestigatorData` — builds `<locale>.json` (signatures, scenario reference cards with chaos-token values) and investigator portraits, published at `neizerth.github.io/ArkhamInvestigatorData`. Useful types: `ChaosBagToken`, `ReferenceCard`, `InvestigatorStats` (`src/model/game/**`).
- `ArkhamDividerData` — builds `core.json` (stories/campaigns/scenarios/encounter sets/packs), published at `neizerth.github.io/ArkhamDividerData`. Types in `src/types/database.ts`.
- `ArkhamInvestigator` (MIT) — Redux chaos-bag/skill-test logic in `slices/features/game/chaos-bag/**` and `selectors/result/selectSkillCheckResult.ts` (autofail, frost, bless/curse). Worth porting as pure functions, not importing.

No repo has a committed card dump; card stats come from ArkhamDB `/api/public/cards/` (or `api.arkham.build/v1/cache/cards/{lang}`). User choices: local hot-seat, Night of the Zealot, English with RU-ready i18n, React + react-three-fiber.

## Goals / Non-Goals

**Goals:**
- Engine is pure TypeScript, has zero imports from React/three, runs in Node tests and in the browser.
- Content is plain JSON on disk; a campaign is a folder.
- Replayable games: `state = replay(seed, setup, actions)`.

**Non-Goals:**
- Full coverage of every rules edge case for cards outside Night of the Zealot + 5 core starter decks. Unused keywords/timing points are added when a card needs them.
- Networking. The action/replay model keeps the door open, nothing more.
- A visual deck builder.

## Decisions

### 1. Project layout — single Vite app, folder boundaries
```
content/                      # all game data (JSON), see §4
scripts/import-cards.ts       # ArkhamDB → content/*/cards.generated.json
scripts/check-content.ts      # schema + reference validation (CI/npm script)
src/engine/                   # pure TS rules engine (no DOM, no React)
  state.ts actions.ts rng.ts engine.ts queue.ts
  rules/{phases,actions,skillTest,chaosBag,enemies,locations,actAgenda,damage,encounter}.ts
  effects/{vocabulary.ts, registry.ts}
src/content/                  # zod schemas, loader (import.meta.glob), i18n
src/ui/                       # React + R3F
  scene/{Table,CardMesh,Hand,LocationMap,PlayerArea,ChaosBag}.tsx
  hud/{Prompt,SkillTestPanel,Menus}.tsx
  store.ts                    # zustand bridge: engine state + event queue for animations
```
One package rather than a monorepo: one app, one consumer. An ESLint `no-restricted-imports` rule keeps `src/engine` free of `react`/`three`/`src/ui`.
*Alternative:* pnpm workspaces with `@ah/engine`. Skipped; we can split it out later if a server is ever needed.

### 2. Engine core — action reducer + resolution queue
- `GameState` is a plain object holding cards by instance id, zones, investigators, locations, enemies, act/agenda, chaos bag, `rng` seed state, a `queue` (stack of pending steps), `pendingChoice`, and `log`.
- The public API is `engine.dispatch(state, action) → { state, events } | { error }`, plus `getLegalActions(state)` and `getPendingChoice(state)`.
- Rules are **steps** pushed onto a LIFO queue. Examples: `BeginSkillTest`, `RevealChaosToken`, `DealDamage`, `CheckWindow(after:'successfulInvestigate')`. `dispatch` keeps resolving steps until the queue is empty or a step needs a player decision, which becomes `pendingChoice`. The next action must be the answer to that choice.
- ~~State is updated with Immer.~~ **Changed during implementation:** `dispatch` deep-copies the state with `structuredClone` and mutates the copy. Immer proxies made a dispatch cost ~100 ms (rules scan all cards many times); a plain copy brings it to <1 ms. The UI still gets a new object per dispatch.
- Timing windows: on each `CheckWindow`, collect triggered abilities (forced first, then optional reactions offered as a choice). This covers "after you successfully investigate", "when an enemy attacks", and so on.
- RNG: mulberry32, with its seed stored in the state. Shuffle and token draw are the only consumers.

*Alternative:* an ECS or a full event-sourced rules engine (like arkham-horror Haskell implementations). Rejected as too heavy; a queue of steps covers the LCG's nested resolution.

### 3. Card effect DSL
Each card's JSON has `abilities: Ability[]`:
```json
{ "type": "reaction", "trigger": "afterEnemyDefeated", "condition": {"atYourLocation": true},
  "limit": "round", "cost": [], "effects": [{"discoverClue": {"from": "yourLocation", "count": 1}}] }
```
- `type` is one of: `revelation | onPlay | action | fast | reaction | forced | constant | elderSign`.
- `effects` is a list of objects discriminated by `op` (e.g. `{ "op": "gainResources", "amount": 3 }`), from a closed vocabulary defined in `src/content/schema.ts` (`Effect`) and interpreted in `src/engine/effects.ts`. Each op is validated by zod, and each maps to step(s) on the queue.
- Escape hatch: `"script": true` → `content/**/scripts/<code>.ts` exports a `CardScript` (`src/engine/types.ts`): extra abilities whose `run` names a function in `fns`, dynamic `modifiers`, `hooks` (gameEnd, eventFinished, spawnRedirect, checkObjectives), `extraActionCost`, `extraPlayable`, `blanks`. Scenario scripts live in `content/campaigns/<id>/scripts/<scenario>.ts`.
- Constant modifiers (e.g. Roland's .38 Special gives +1 combat) are evaluated whenever a value is computed (`getSkill`, `getFight`), not stored.

*Alternative:* scripts only. Rejected because the user wants to add cards through data; most core cards fit the vocabulary.

### 4. Content layout and import
```
content/
  packs/core/cards.generated.json      # from ArkhamDB, never hand-edited
  packs/core/cards.json                # hand-written overrides by code: abilities, script flag, fixes
  investigators/<code>.json            # links to card code + elder sign, deckbuilding, signatures
  decks/<slug>.json                    # {investigator, cards:{code:qty}}
  campaigns/night-of-the-zealot/
    campaign.json                      # scenarios order, chaos bags per difficulty, log keys
    scenarios/the-gathering.json       # encounter sets, setup, act/agenda codes, token effects, resolutions
    scripts/*.ts
  i18n/{en,ru}/{ui.json, cards.json}
```
- The loader merges `generated` with overrides by code. Re-import only rewrites `*.generated.json`, so hand-written abilities are never touched. This satisfies "re-import keeps effects" without a merge algorithm.
- `scripts/import-cards.ts --pack core` fetches `https://arkhamdb.com/api/public/cards/?encounter=1`, filters by `pack_code`, and maps fields to our schema. Shape is aligned with `inspired/ArkhamDividerData` types.
- Location connections are not in ArkhamDB data, so each scenario file lists them as code pairs (`connections`). Where the printed connections were not available (Midnight Masks map, Devourer Below woods), the graph is an approximation — fix by editing the scenario JSON.
- Encounter set and scenario metadata are checked against ArkhamDivider `core.json`. Token values on reference cards are seeded from ArkhamInvestigatorData `en.json`, then committed as JSON so runtime has no dependency on those hosts.
- Content is loaded with Vite `import.meta.glob('/content/**/*.json', { eager: true })`. No server is needed and adding files needs no registration.
- Images: `https://cdn.arkham.build/optimized/<code>.webp`; back faces use `<code>b`. If an image fails, the fallback is a CanvasTexture rendered from card data.

### 5. Campaign & persistence
- Campaign state = `{ campaignId, difficulty, log: Record<key, value|string[]>, investigators: {code, deck, xp, physicalTrauma, mentalTrauma, status}, scenarioIndex }`.
- Setup steps and resolutions are data. Conditions use a small predicate schema (`{"logHas": "houseBurned"}`), and outcomes use the same effect vocabulary plus campaign-level effects (`recordLog`, `addXp`, `addCardToDeck`, `nextScenario`).
- Save = `localStorage['ah:save'] = { campaign, scenario: { seed, setup, actions[] } }`. Resume replays the actions. This is cheap, deterministic, and doubles as a bug-report artifact.

### 6. Rendering (react-three-fiber)
- A `PerspectiveCamera` sits about 60° from the table, looking down: Hearthstone-ish, with slight depth.
- `layout(state, viewerId) → Map<cardInstanceId, {pos, rot, faceUp, zone}>` is a pure function. Each `CardMesh` eases toward its target using `maath/easing.damp3` in `useFrame`. Animations then fall out of state changes; the event log only adds extras (token pop, damage numbers) and gates input.
- A card is a thin box/rounded plane with front and back textures from a shared texture cache (drei `useTexture`, with the fallback above).
- The HUD is plain React DOM over the canvas. Prompts, the skill test panel, menus and the hand zoom tooltip live there. Clickables in 3D get `onPointerOver/onClick`, and a mesh is interactive only if its id is in `legalTargets`.
- Hot-seat: `viewerId` = the investigator who must act next (or the one in `pendingChoice`). A pass screen appears whenever `viewerId` changes and privacy is on.
- State glue: a zustand store holds `{ state, eventQueue, viewerId }`. UI calls `dispatch`, and the store enqueues events for animation.

### 7. Testing
- Vitest on the engine. Each spec scenario in `game-engine`, `campaign-play` and `investigator-decks` becomes a test that builds state from real content files.
- A scripted, seeded playthrough test of The Gathering checks replay determinism.
- `npm run check:content` runs in CI.
- UI is verified manually with a debug panel (state JSON, seed, action log download).

## Risks / Trade-offs

- [Card rules complexity grows faster than the DSL] → keep the vocabulary small and use scripts liberally. Review the vocabulary only when 3+ cards need the same script pattern.
- [Timing-window edge cases (simultaneous forced effects, nested tests)] → resolve "lead investigator chooses order" via `pendingChoice`. Cover NotZ cards with tests; other edge cases are accepted as unsupported for now.
- [External image/CDN availability or terms] → images are fetched lazily and never bundled; the text-face fallback always works. Card art is FFG copyright: personal use only until licensing is checked.
- [Replay-based saves break when engine rules change] → store `engineVersion` in the save. On mismatch, offer to restart the scenario while keeping the campaign log, which is plain data.
- [Immer performance with large states] → state is small (<500 cards); profile only if dispatch takes more than 5 ms.
- [Ported chaos-bag logic from ArkhamInvestigator (MIT)] → keep attribution in the file header.

## Migration Plan

Greenfield; no migration. Delivery order: engine + content schema → NotZ content and starter decks → table UI → campaign flow → polish. The engine is playable headless (in tests) before any 3D work.

## Open Questions

- Should RU card text come from ArkhamDB `ru.arkhamdb.com` or from the arkham.build `ru` cache? Either fits the i18n file format; decide when adding RU.
- Should taboo list support be added? It's not needed for core starter decks.
