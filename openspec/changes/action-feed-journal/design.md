## Context

- **Engine log:** `game.log` holds every `GameEvent` (`type`, English `text`, optional `inv`, `card`, `data`). There are about 50 event types (`emit(g, "<type>", …)` across `src/engine`).
- **Event data is uneven.** Some events carry their numbers (`clues` → `data.n`, `damage` → `{damage, horror}`, `doom` → `n`, `testResult` → the full breakdown). Others have them only in the text (`resource` gain/loss, `heal`, `attack`, `draw` counts).
- **Playback:** the store queues only `ANIMATED` events (`current` / `queue`) and plays them one at a time. Other events are already in `game.log` the moment `dispatch` returns.
- **Today's display:** the Log button opens a plain-text `LogPanel`. `EventPlayer` shows `e.text` in a banner for animated events, except the token draw and the test breakdown.
- **Right side:** the chaos bag (top right) and the investigator tokens under it are separately fixed elements.
- **Reusable pieces:** `Portrait`, `CardFace`, `Icon`, `ChaosTokenIcon`, the card modal (`setModal({card})`), the hover overlay (`setHover`), the class colours (`CLASS_COLORS`) and `t()`.

## Goals / Non-Goals

**Goals:**
- One pure function turns an event into styled parts. The feed, the Journal and the toasts all render those parts the same way.
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
  - It renders the newest ≤ 8 shown entries, keyed by log index.
  - **Appear:** a CSS `@keyframes feed-in` animation, from `translateY(16px); opacity: 0` to rest, over 300 ms. Entries above move up smoothly with a FLIP: measure each item's previous `offsetTop` in a layout effect and transition the difference.
  - **Fade from bottom to top:** opacity by position from the bottom, `1 − 0.11·k` for k = 0..7.
  - **Leaving:** an entry whose arrival time (kept in a ref keyed by log index) is more than 12 s ago, or which is the 9th or older, gets `.leaving` (`translateY(-14px); opacity: 0` over 400 ms) and is dropped after the transition.
- **Journal mode:**
  - It is the same component with `mode = "journal"`: every shown entry, oldest first, in a scroll container with no fading.
  - It opens scrolled to the bottom and keeps following new entries while the user is at the bottom.
  - Escape returns to live mode.
- **Navbar:** the Log button becomes **Journal** (`hud.journal`) and toggles `useView.feedMode`. `LogPanel` is removed; the raw text stays in the Debug panel's state dump.
- **Thumbnails:** a `card` part is a 28×39 `CardFace` button with the card name.
  - Click → `setModal({ card })`; hover → `setHover(id, rect)`.
  - A card no longer in the game (removed) is shown without the click.

### 5. Centre-screen toasts (`hud/Toasts.tsx`)
- When the shown count grows, the new entries' parts go into a toast queue.
- Toasts are released 350 ms apart. Each lives 1.5 s and is positioned at about 38% of the screen height.
  - Animation: `toast-rise`, from `translateY(0) scale(.9); opacity: 0` to `translateY(-60px); opacity: 0` with a fully visible middle.
  - At most three are visible at once, stacked 44 px apart.
- **Burst cap:** if more than 6 arrive at once (for example the start of a scenario), only the last 3 toast.
- `pointer-events: none`, z-index below modals.
- The plain-text banner in `EventPlayer` is removed. The token draw and the test breakdown keep their own overlays.

### 6. Translations
- `feed.*` templates go in `en/ui.json` and hand-written `ru/ui.json`: about 30 types plus `feed.outcome.ok` / `feed.outcome.fail`.
- The test from Decision 2 checks that every English template has a Russian counterpart with the same placeholders.

## Risks / Trade-offs

- [A long Journal (hundreds of entries) re-renders a lot] → Parts are memoised by log index, since log entries never change once appended. Only the shown slice re-renders.
- [Toasts in fast bot play] → Bot play and `skipEvents` advance the cursor in one jump; the burst cap shows only the last three.
- [The extra event data grows saves slightly] → It is small numbers on log entries, which saves already store.
- [Feed text overlapping the HUD on small windows] → The column sizes to the space left; below 800 px tall, the live feed shows at most 5 entries.

## Migration Plan

- The UI and event data are additive. Old saves replay into the new data automatically, because saves are action logs.
- Archive after `map-viewport-sticky-hud`.
