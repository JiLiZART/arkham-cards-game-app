## Context

- **Engine log:** `game.log` holds every `GameEvent` (`type`, English `text`, optional `inv`, `card`, `data`). There are about 50 event types (`emit(g, "<type>", …)` across `src/engine`).
- **Event data is uneven.** Some events carry their numbers (`clues` → `data.n`, `damage` → `{damage, horror}`, `doom` → `n`, `testResult` → the full breakdown). Others have them only in the text (`resource` gain/loss, `heal`, `attack`, `draw` counts).
- **Playback:** the store queues only `ANIMATED` events (`current` / `queue`) and plays them one at a time. Other events are already in `game.log` the moment `dispatch` returns.
- **Today's display:** the Log button opens a plain-text `LogPanel`. `EventPlayer` shows `e.text` in a banner for animated events, except the token draw and the test breakdown.
- **Right side:** the chaos bag (top right) and the investigator tokens under it are separately fixed elements.
- **Reusable pieces:** `Portrait`, `CardFace`, `Icon`, `ChaosTokenIcon`, the card modal (`setModal({card})`), the hover overlay (`setHover`), the class colours (`CLASS_COLORS`) and `t()`.

## Goals / Non-Goals

**Goals:**
- One pure function turns an event into styled parts. The feed, the Journal, the action floats and the prompt banner all render those parts the same way.
- The feed never shows an event before the table animates it.
- Every event type has a template (enforced by a test), with a styled generic fallback.

**Non-Goals:**
- Filtering or searching the Journal.
- Persisting the Journal across scenarios. It is the current scenario's `game.log`, which saves already keep.
- Translating the engine's fallback text.

## Decisions

### 1. Engine: complete the event data (additive)
- Audit every `emit()` and add the missing fields:
  - `resource` `{ n, lost? }`, `heal` `{ damage, horror }`, `attack` `{ damage, horror }`;
  - `draw` `{ n }` per card, already one event per card;
  - `play` / `commit` / `discard` / `encounter` keep `card`;
  - `move` `{ from }`, `spawn` `{ at }`, `enemyDefeated` `{ by }`, `phase` `{ phase }`, `actAdvance` / `agendaAdvance` (`card`), `testStart` `{ skill, kind }`.
- No logic changes. Replaying the scenario tests' action logs must give identical states apart from `log[].data`, which an engine test asserts.
- *Alternative:* parse the English text in the UI. Rejected: it is brittle, untranslatable, and breaks whenever wording changes.

### 2. `feed.ts`: event → parts
```ts
type Part = { t: "text"; s: string }
  | { t: "inv"; id: InvId }                 // round portrait + class-coloured name
  | { t: "card"; id: InstId }               // thumbnail + name; click → modal, hover → HoverCard
  | { t: "amount"; n: number; icon: IconName }
  | { t: "icon"; name: IconName }           // skills, etc.
  | { t: "token"; token: string }           // chaos token art
  | { t: "outcome"; ok: boolean };          // "succeeded" (green) / "failed" (red)
export function feedEntry(e: GameEvent, game: GameState, locale: string): { parts: Part[]; tone: "player" | "enemy" | "game" } | null;
```
- **Templates** live in `ui.json` as `feed.<type>` strings with placeholders, for example:
  - `"feed.resource": "{inv} took {n:resource}"`
  - `"feed.attack": "{card} attacked {inv}: {damage:damage} {horror:horror}"`
- A tiny parser splits the template into parts: `{inv}`, `{card}`, `{target}`, `{n:<icon>}`, `{skill}`, `{tokens}`, `{outcome}`. Zero amounts are dropped (an attack with 0 horror shows no horror icon).
- **Missing template:** the generic fallback, `{inv|card} {text}`, used whenever a type has no template.
- **Noise:** `setup`, `shuffle` and `ready` return `null`, so they are hidden.
- **Unit tests:**
  - every event type emitted in bot playthroughs of all three scenarios yields non-null parts, or is in the hidden list;
  - no part contains an unreplaced `{…}`;
  - `resource`, `attack` and `testResult` produce the expected parts.

### 3. Feed cursor (never ahead of the table)
- The store records, for each queued animated event, its index in `game.log` (`logIndex`). The visible count is:
  - `current ? current.logIndex + 1 : queue[0]?.logIndex ?? game.log.length`.
- Non-animated events before an animated one show at once. The ones after it show when it starts playing.
- This is a pure helper `shownCount(log, current, queue)`, with a unit test.

### 4. Live feed and Journal (`hud/Feed.tsx`)
- **Layout:** a single `.right-col` flex column, fixed to the right edge, 300 px wide. It stacks:
  - the chaos bag;
  - the investigator tokens;
  - the feed (`flex: 1; min-height: 0`), down to just above the camera buttons and the action rail.

  `HUD_INSETS.right` becomes 320.
- **Live mode:**
  - Kill-feed order: it renders the newest ≤ 8 shown entries newest-first (top to bottom), keyed by log index.
  - **Appear at the top:** a CSS `@keyframes feed-in` animation, from `translateY(-16px); opacity: 0` to rest, over 300 ms. Entries below move down smoothly with a FLIP: measure each item's previous `offsetTop` in a layout effect and transition the difference.
  - **Fade toward the bottom:** opacity by position from the top, `1 − 0.11·k` for k = 0..7.
  - **Leaving:** an entry whose arrival time (kept in a ref keyed by log index) is more than 12 s ago, or which is the 9th or older, gets `.leaving` (`translateY(14px); opacity: 0` over 400 ms) and is dropped after the transition.
- **Journal mode:**
  - It is the same component with `mode = "journal"`: every shown entry, newest first, in a scroll container with no fading.
  - It opens at the top; new entries keep appearing there, and the scroll position is kept while the user is reading further down.
  - Escape returns to live mode.
- **Navbar:** the Log button becomes **Journal** (`hud.journal`) and toggles `useView.feedMode`. `LogPanel` is removed; the raw text stays in the Debug panel's state dump.
- **Thumbnails:** a `card` part is a 28×39 `CardFace` button with the card name.
  - Click → `setModal({ card })`; hover → `setHover(id, rect)`.
  - A card no longer in the game (removed) is shown without the click.

### 5. Action floats (`hud/Floats.tsx`), anchored like the damage numbers
- When the shown count grows, the new entries' parts go into a float queue, each with an anchor:
  - the acting investigator's marker (`minis`), when the event's `inv` is on the map;
  - else the event's card, when it is a map card (an enemy or location);
  - else the screen centre.
- Floats are released 350 ms apart and each lives 1.5 s.
- **Position:** every frame, from `mapProjector`, the same projection the hover overlay uses (extended with `projectMini(inv)`), re-read on `camTick`. That way the float follows the camera, like `FloatingNumber`, which rises in world space. An anchor that projects off-screen falls back to the centre.
- **Animation:** `float-rise`, rising 70 px with opacity 0 → 1 → 0 and a slight scale-in. Floats rising from the same anchor are offset 40 px so they don't overlap; at most three are visible at once.
- The floats are DOM, not drei `Html`, so their text stays sharp and they never take the pointer. The existing WebGL `FloatingNumber` damage numbers stay as they are.
- **Burst cap:** if more than 6 arrive at once (for example the start of a scenario), only the last 3 float.
- `pointer-events: none`, z-index below modals.
- The plain-text banner in `EventPlayer` is removed. The token draw and the test breakdown keep their own overlays.

### 6. Translations
- `feed.*` templates go in `en/ui.json` and hand-written `ru/ui.json`: about 30 types plus `feed.outcome.ok` / `feed.outcome.fail`.
- The test from Decision 2 checks that every English template has a Russian counterpart with the same placeholders.

### 7. Prompt banner
- **Engine:** `ask()` gets an optional `{ key, vars }`, stored on `PendingChoice` as `promptKey` and `promptVars`. All 23 call sites pass one, for example:
  - `turn {inv, actions}`, `commit {inv, skill}`, `assign {inv, kind, left}`, `mulligan {inv, n}`, `discardDown {inv, n}`;
  - `chooseEnemy`, `chooseLocation {purpose}`, `chooseInvestigator`, `nextTurn`, `chooseSkill`, `chooseOne`, `search {top}`, `spawnAt {card}`, …

  The English text is kept as the fallback.
- **UI:** `PromptBanner` renders through the same template parser as the feed (`prompt.<key>` templates in `ui.json`), so placeholders like `{inv}`, `{card}`, `{n:action}` and `{skill}` produce styled parts. The investigator part always leads (portrait plus class-coloured name).
- **Look:** 22 px Alegreya with bold numbers, `.card-name` type for card names, a gold border, and more padding.
- **Test:** every `promptKey` seen in bot playthroughs has `en` and `ru` templates with the same placeholders.

### 8. Rounded map cards and thinner frames
- `CardMesh` replaces the `BoxGeometry` with a rounded-rectangle `ShapeGeometry`, extruded to the same 0.012 depth: corner radius 4.5% of the width, which matches the printed corners. The UVs are mapped to the card's bounding box so the scan textures still fit.
- The glow plane becomes a rounded frame: a ring shape (outer rounded rectangle minus inner) 0.03 units wide, half the current 0.06 per side, with the same corner radius plus the frame width.
- Both geometries are memoised per (w, h).

### 9. Hand card details
- A pure `cardDetails(def, text, locale)` returns rows from the card data: name, subname, faction, type, `xp`, `cost`, traits, `slots`, `icons`, health and sanity, `uses`, and text. Missing fields are skipped. It is unit-tested with Machete (01020), a skill and an ally.
- **`HandDetails`** is a fixed DOM column (`pointer-events: none`, about 280 px wide, 17 px Alegreya, with the name in card-name type). It renders the rows with `Icon` and `Glyph` (class, skills, slots, the resource icon for cost, XP as filled and empty pips) and `formatText` for the text.
- **Position:**
  - `HandFan` already knows the hovered or focused card (from `setHovered` and focus). On hover it measures the raised card's `getBoundingClientRect()` after the transition (`transitionend`, or about 200 ms) and places the column 12 px to its right, top-aligned.
  - If `rect.right + 12 + 280 > innerWidth − 8`, the column goes to the left of the card instead.
  - The vertical position is clamped to the window.
- A pure `placeDetails(rect, width, viewport)` does this placement, with unit tests for the right side, the left fallback and the clamp.
- It hides while dragging a card and behind the hand-off screen.

## Risks / Trade-offs

- [A long Journal (hundreds of entries) re-renders a lot] → Parts are memoised by log index, since log entries never change once appended. Only the shown slice re-renders.
- [Floats in fast bot play] → Bot play and `skipEvents` advance the cursor in one jump; the burst cap shows only the last three.
- [The extra event data grows saves slightly] → It is small numbers on log entries, which saves already store.
- [Feed text overlapping the HUD on small windows] → The column sizes to the space left; below 800 px tall, the live feed shows at most 5 entries.

## Migration Plan

- The UI and event data are additive. Old saves replay into the new data automatically, because saves are action logs.
- Archive after `map-viewport-sticky-hud`.
