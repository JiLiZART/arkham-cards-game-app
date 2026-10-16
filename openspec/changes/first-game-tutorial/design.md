## Context

- The game store exposes `pending`, `current`, `queue`, `phase` and the log; the view store exposes the stage, the showcase and the intro. "Nothing plays and the middle is free" is `stage.length === 0 && !current && !queue.length`.
- HTML anchors exist for most targets: the rail buttons, the stat dock portrait (`.stat-dock .portrait-btn`), the act card, the chaos bag (`#chaos-bag`), the skill test panel, the instruction bar. Map cards have projected rects through `mapProjector.rect`.
- Settings persist in the save's `settings`; nothing else uses local storage besides the save.
- Hover cards and the hand details already place floating boxes beside a rect (`placeHover`, `placeDetails`).

## Goals / Non-Goals

**Goals:**
- Tips as data: adding one is a string pair and a condition.
- The layer never fights the stage or the input block; it reads them.
- Works in a normal game, with any investigators, in both languages.

**Non-Goals:**
- A scripted tutorial scenario with a fixed deck and seed. Tips teach in whatever game the player starts.
- Rules reference or glossary beyond the five-part summary.
- Hints for card-specific abilities.

## Decisions

### 1. A tip is `{ id, when, anchor }`
`src/ui/tips.ts` exports `TIPS: Tip[]`, each with `when(game, view): boolean` (the situation holds now and addresses the viewer) and `anchor(game): { selector } | { card } | { inv } | null`. `pickTip(game, view, seen, on)` returns the first tip whose `when` holds and whose id isn't in `seen`, or null. Pure and tested. The text comes from `tip.<id>` in the i18n files.

Conditions use what the state already says: `pending.kind === "mulligan"`, `pending.kind === "turn"` with the first `turn` entry in the log, `pending.kind === "commit"`, the token draw by hand, an `enemy` zone card at the viewer's location, a `damage` entry for the viewer, `phase === "mythos"`, `phase === "upkeep"`, `actionsLeft === 0`, and `canUndo`.

### 2. `TipLayer` shows one tip and dismisses it by state
The layer picks a tip on every store change, but shows it only when the stage is empty and nothing plays or is queued. It renders a `tip-card` placed beside the anchor's rect with an arrow, following the camera for map anchors (re-placed on `camTick`). The tip is dismissed, and its id added to `seen`, when: its `when` stops holding; "Got it" is tapped; or the viewer changes. A dismissed tip is written to local storage at once.

*Why dismiss by state, not by click targets:* "do what it says" is already a state change (the test started, the portrait moved, the card was played). No per-anchor click handlers.

### 3. Seen tips in local storage, the toggle in the save settings
`ah:tips` holds the seen ids as a JSON array through the store's `safeStorage()`. `tipsOn` lives in `UiState` and the save's `settings`, like `drawByHand`. Reset clears `ah:tips`.

### 4. How to play is a menu screen of strings
`Screens.tsx` gets a `howto` screen: five `howto.<part>.title` / `.text` pairs and Back. No images in the first version; the same sentences the tips use, so one wording to maintain.

### 5. Wording rules for the strings
One idea per sentence, no rules terms without the plain word first ("shroud, how hard the room is to search"), always the verb and the target ("Tap your portrait and drag it to a room next to yours"). Russian written directly, not translated word by word.

## Risks / Trade-offs

- **A tip points at something off screen** (a map card outside the view). Mitigation: map anchors fall back to the Focus button with "tap Focus to see it", or the tip docks to the bar when the rect is outside the viewport, as the floats do.
- **Tips pile up in a busy first round** (turn, investigate, test, token, enemy in one turn). One at a time and dismissed by doing, so each shows for the moment it's about; the order follows the situations.
- **Privacy mode:** a tip for Daisy must not show on Roland's screen. `when` checks the viewer and the hand-off state, same as the instruction bar.
- **Anchors change** when choice-bar and round-tracker land. Tips use data attributes (`data-tip="investigate"`) on their anchors rather than class selectors, so a layout change updates one attribute.
