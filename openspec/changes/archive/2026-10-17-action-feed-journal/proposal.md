## Why

There is no readable record of what happens during play. The engine's log is plain English text, and it only appears in the debug-style Log panel. Investigators, enemies and the game act all the time (draws, resources, clues, attacks, spawns, doom), but only the few animated events get a short banner. Players can't follow what teammates and enemies just did, or look back at it later.

## What Changes

- **Action feed** in a new right-hand column under the chaos bag and the other investigators' portraits. It shows a live list of styled entries for everything that happens:
  - every investigator's actions;
  - enemy actions;
  - game actions: phases, mythos draws, doom, act and agenda advances, spawns.

  It works like a shooter's kill feed: new entries drop in at the top and push older ones down. Entries grow fainter the lower they sit, and the oldest fade out at the bottom (after about 12 s, or beyond the newest 8), so the live feed stays short.

- **Entries are styled sentences, not raw text**, for example `[Roland portrait] Roland Banks took 2 [resource icon]`.
  - Investigators appear as their portrait and class-coloured name; enemies as their card thumbnail and name.
  - Amounts appear as token icons (resources, clues, damage, horror, doom) and skills as their icons.
  - Chaos tokens appear as tokens, and success or failure in colour.
- **Cards in entries:** when an entry involves a card (drawn, played, discarded, an encounter card), it shows a small thumbnail. Clicking it opens the card in the existing card modal.
- **Journal:** the navbar's Log button becomes **Journal**. It switches the same column to the full history of the scenario, in the same styled form, newest at the top, scrollable down to the start of the scenario. Clicking it again returns to the live feed.
- **Action floats:** as each entry arrives, the same styled sentence rises from whoever did it and fades, exactly like the damage numbers.
  - It starts at the acting investigator's portrait on the map, or the enemy's card, and follows that spot as the camera moves.
  - When the actor isn't on the map or is off-screen (for example a phase change or an encounter draw), it rises from the centre of the screen.
  - Floats are staggered so bursts stay readable. They replace the plain-text event banner.
- **Prompt banner:**
  - bigger, about 22 px text;
  - the deciding investigator's portrait and class-coloured name;
  - translated, with the key parts in bold or colour, for example "**Roland Banks**: choose an action — ➤➤➤ 3 left", or a highlighted card or location name.
- **Hand card details:** hovering a hand card shows a column right beside the enlarged card (or on its left at the right end of the fan). It lists name, class and type, level (XP pips), cost, traits such as Item. Weapon. Melee., slots, skill icons, health and sanity or uses, and the rules text, in large type, so you don't have to read the card's small print.
- **Location cards:** the highlight border is half as thick and has rounded corners, and the card corners are rounded like the printed cards.
- **Engine (additive only):** events carry the numbers and references the sentences need, such as `n` for resources and heals, damage and horror for attacks, and source and target cards. No rules change. Saves and action-log replays are unaffected.
- All entry templates are translated (English and Russian), with placeholders for portraits, names, icons and cards.
- **Engine (additive only):** each pending choice carries a prompt key and values, for example `turn` with `{actions: 3}`, next to the English prompt, so the banner can translate and style it.

## Capabilities

### New Capabilities

- `action-feed`: the live action feed, the Journal history, styled entries with card thumbnails, and action floats rising from the actor like the damage numbers.

### Modified Capabilities

- `game-engine`: "Event log" — every event carries structured data (who, which card, amounts) so it can be shown without parsing text; added "Translatable prompts".
- `game-table-ui`: added "Prompt banner" (bigger, styled, translated), "Map card frames" (thinner, rounded highlight; rounded card corners) and "Hand card details" (a details column beside a hovered hand card).

## Impact

- **Engine:** `src/engine/**` `emit()` calls gain `data` fields, such as `{ n }`, `{ damage, horror }` and `{ by }`. A test asserts that every emitted event type has a feed template.
- **UI code:**
  - new `src/ui/feed.ts`: a pure function turning an event into styled segments;
  - new `src/ui/hud/Feed.tsx`: the live feed and Journal;
  - `src/ui/hud/Hud.tsx`: the Log panel and event banner are replaced by Journal and action floats;
  - `src/ui/hud/ActionRail.tsx`: the prompt banner;
  - `src/ui/hud/HandFan.tsx`: the details column for the hovered card;
  - `src/ui/scene/CardMesh.tsx`: rounded card and frame geometry;
  - `src/ui/store.ts`: a cursor so the feed doesn't show events before their animation plays.
  - The camera's right HUD inset grows to make room for the column.
- **Content:** `content/i18n/{en,ru}/ui.json` get `feed.*` templates.
- **Order:** this builds on `map-viewport-sticky-hud` (the right-hand column, the card modal and the hover). Archive after it.
