## Why

There is no readable record of what happens during play. The engine's log is plain English text, and it only appears in the debug-style Log panel. Investigators, enemies and the game act all the time (draws, resources, clues, attacks, spawns, doom), but only the few animated events get a short banner. Players can't follow what teammates and enemies just did, or look back at it later.

## What Changes

- **Action feed** in a new right-hand column under the chaos bag and the other investigators' portraits. It shows a live list of styled entries for everything that happens:
  - every investigator's actions;
  - enemy actions;
  - game actions: phases, mythos draws, doom, act and agenda advances, spawns.

  New entries slide up and fade in at the bottom, pushing older ones upward. Entries grow fainter the higher they sit, and the oldest fade out while sliding off the top (after about 12 s, or beyond the newest 8), so the live feed stays short.
- **Entries are styled sentences, not raw text**, for example `[Roland portrait] Roland Banks took 2 [resource icon]`.
  - Investigators appear as their portrait and class-coloured name; enemies as their card thumbnail and name.
  - Amounts appear as token icons (resources, clues, damage, horror, doom) and skills as their icons.
  - Chaos tokens appear as tokens, and success or failure in colour.
- **Cards in entries:** when an entry involves a card (drawn, played, discarded, an encounter card), it shows a small thumbnail. Clicking it opens the card in the existing card modal.
- **Journal:** the navbar's Log button becomes **Journal**. It switches the same column to the full history of the scenario, in the same styled form, scrollable, and starting at the newest entry. Clicking it again returns to the live feed.
- **Centre-screen toast:** the same styled sentence briefly appears in the middle of the screen as each entry arrives, floating up and fading like the damage numbers. Toasts are staggered so bursts stay readable. They replace the plain-text event banner.
- **Engine (additive only):** events carry the numbers and references the sentences need, such as `n` for resources and heals, damage and horror for attacks, and source and target cards. No rules change. Saves and action-log replays are unaffected.
- All entry templates are translated (English and Russian), with placeholders for portraits, names, icons and cards.

## Capabilities

### New Capabilities
- `action-feed`: the live action feed, the Journal history, styled entries with card thumbnails, and centre-screen toasts.

### Modified Capabilities
- `game-engine`: "Event log" — every event carries structured data (who, which card, amounts) so it can be shown without parsing text.

## Impact

- **Engine:** `src/engine/**` `emit()` calls gain `data` fields, such as `{ n }`, `{ damage, horror }` and `{ by }`. A test asserts that every emitted event type has a feed template.
- **UI code:**
  - new `src/ui/feed.ts`: a pure function turning an event into styled segments;
  - new `src/ui/hud/Feed.tsx`: the live feed and Journal;
  - `src/ui/hud/Hud.tsx`: the Log panel and event banner are replaced by Journal and toasts;
  - `src/ui/store.ts`: a cursor so the feed doesn't show events before their animation plays.
  - The camera's right HUD inset grows to make room for the column.
- **Content:** `content/i18n/{en,ru}/ui.json` get `feed.*` templates.
- **Order:** this builds on `map-viewport-sticky-hud` (the right-hand column, the card modal and the hover). Archive after it.
