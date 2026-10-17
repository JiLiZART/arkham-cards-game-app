## Why

The hand fan takes a third of the screen at rest and still tells the player nothing about a card until they hover it: what it does, what it commits, how many cards they hold. A player scanning seven cards for "something that fights" has to read seven rules texts. Card games answer this with smaller cards that carry a glance summary, and a hand count where the other totals live.

## What Changes

- **Cards 25 % smaller.** Resting size 225×315 px (from 300×420); the hovered card 288×403 (1.28× as before); the Dock magnification, lifts and overlap scale with it. The details column beside the hovered card is unchanged.
- **A glance badge on every hand card.** Up to three icon-and-number chips along the card's top edge saying what the card is useful for, derived from card data in priority order: what its play or ability does (fight → [combat], investigate → [intellect], evade → [agility], damage dealt → [damage] n, healing → [health] or [sanity] n, clues → [clue] n, cards drawn → [card] n, resources gained → [resource] n), then the skill icons it commits, merged by skill ([combat] 2, [wild] 1). Cost is not repeated. A per-card override table covers cards the data can't read; a chip the data can't produce is left out, never guessed. Chips are icons, so nothing to translate; the tooltip names them.
- **A hand count in the token row.** After the resource and clue stacks: a card-back icon with the number of cards in hand, tooltip "Cards in hand: 7 (hand limit 8)", the number red when over 8.

Out of scope: the showcase and the play strip (their cards keep their sizes), the phone fan, badges on cards outside the hand.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `game-table-ui`: the hand fan (sizes, the glance badge) and the stat bar (the hand count).

## Impact

- `src/ui/hud/fan.ts` (sizes and derived constants), `src/ui/layout.ts`/`HandFan.tsx` where the constants are read, `src/ui/safeArea.ts` (`HUD_INSETS.bottom` shrinks with the fan), `styles.css` (`.fan-card`, `.hand-fan`).
- New `src/ui/glance.ts` (pure: card → up to three chips, with the override table) and `glance.test.ts`; `HandFan.tsx` renders the chips; `TokenBadges.tsx` or a new `GlanceBadge` component.
- `src/ui/hud/Stats.tsx` (`HandCount` in the token row), `content/i18n/{en,ru}/ui.json` (`stat.hand`, `stat.handLimit`).
- Browser scripts that click fan cards by coordinates (`drive-calm.js` hovers at y = 880 and clicks at 700) need the new resting height.
- Depends on nothing in flight; `svg-icons` would change how the chips' icons are drawn but not which.
