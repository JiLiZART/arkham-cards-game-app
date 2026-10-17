## Why

Moving the pointer along the hand fan jumps: each card snaps up to its full 1.6× hover size on its own, and its neighbours don't react, so sweeping from left to right feels choppy and the raised card covers too much of the table. Locations are hard to read in a different way: their clues show as a single small badge, and hovering a location shows nothing (its hover copy was removed on purpose), so the shroud, clues and text have to be read off the card art.

## What Changes

- **Hand fan behaves like the macOS Dock.** As the pointer moves across the fan, the card under it grows the most and its neighbours grow a little, falling off smoothly with distance. Size and lift follow the pointer continuously (eased, no snapping), and the fan settles back smoothly when the pointer leaves.
- **Smaller hover zoom.** The fully hovered hand card is 20% smaller than now: 1.28× instead of 1.6× (`HAND_HOVER_ZOOM`). The details column from `action-feed-journal` stays beside it and follows its new size.
- **Clues on locations as a token stack.** A location's clues are drawn as a pile of clue tokens (3s and 1s, fewest tokens) with the total, the same way the stat bar shows resources and clues. The other token badges on map cards (damage, horror, doom) stay as they are.
- **Location details on hover.** Hovering a location on the map shows a details column beside it, like the hand card column (still no enlarged copy). It lists the name, traits, shroud, clues on it (and the printed clue value, per investigator where it applies), victory points, connections, investigators and enemies there, and the rules text. Unrevealed locations show only their back: name and back text. It never takes the pointer and is translated.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `game-table-ui`: the hand fan hover becomes a Dock-style magnification at a smaller zoom; locations show clues as a token stack and a details column on hover.

## Impact

- `src/ui/hud/fan.ts`: `HAND_HOVER_ZOOM` 1.6 → 1.28, plus a pure Dock-magnification function (scale and lift per card from the pointer's x).
- `src/ui/hud/HandFan.tsx` and `styles.css`: pointer tracking over the fan, per-card scale and lift from the Dock function with smoothing; the CSS `:hover` zoom is replaced. Keyboard focus keeps raising the focused card.
- `src/ui/hud/HandDetails.tsx`: placed from the magnified card's rect.
- `src/ui/details.ts`: `cardDetails` learns location rows (shroud, clues, victory, connections, who's there).
- `src/ui/scene/CardMesh.tsx` and `src/ui/hud/Stats.tsx`: `TokenStack` reused for clues on locations.
- `src/ui/hud/HoverCard.tsx` (or a new small component): the location details column, anchored with `mapProjector.rect`.
- `content/i18n/{en,ru}/ui.json`: labels for shroud, clues, victory, connections.
- No engine or content changes.
