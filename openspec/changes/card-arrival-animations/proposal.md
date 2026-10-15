## Why

Only encounter cards are animated today: they fly from the encounter pile to the middle and flip. Every other card just pops into place: a drawn card appears in the fan, a played asset appears in the play strip, a spawned enemy or a newly placed location appears on the map. It's hard to see what changed, and it feels flat next to Hearthstone, where every card visibly travels from where it was to where it lands.

## What Changes

- **Drawing (Hearthstone style).** A card you draw rises out of your deck pile face down, flips while it travels to a "show" spot above the hand, is held there enlarged for a moment, then shrinks and flies into its place in the fan as the fan opens a gap for it. Several draws (the opening hand, Upkeep plus card effects) leave the deck one after another, slightly staggered; the opening hand and mulligan redraws skip the hold.
- **Any card arriving in a hand.** Cards returned to hand from play, the discard pile or anywhere else fly from where they were into the fan, without the hold.
- **Playing a card from hand.** An asset (or anything else put into play from your hand) flies from its place in the fan to its slot in the play strip; an event flies to the middle where it resolves, as now.
- **Cards arriving on the table.** Cards entering the play strip or threat area fly in from where they came from (your hand, deck, the encounter pile or the middle where an encounter card was shown). Cards entering the map (a spawning enemy, a location put into play, an attachment) glide in from the place they came from instead of appearing in place: the middle for an encounter card that was just shown, the encounter pile, or the act/agenda panel for locations placed by an act.
- **Other investigators' cards.** When an investigator who isn't the viewer draws, a face-down card flies from the pile column on the left to their token on the right (their own deck is not on screen), so hidden information stays hidden (weaknesses that resolve on draw are public and show face up, as now).
- Animations never block input for longer than the existing event player does, never take the pointer, and are skipped when the system asks for reduced motion.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `game-table-ui`: new requirement for card arrival animations (draws, hand arrivals, played cards, cards entering the play strip, threat area and map).

## Impact

- `src/ui/arrivals.ts` (new): tracks each card's previous zone across game states and records arrivals (card, from-zone, to-zone, when, who), with pure helpers to pick origin and target.
- `src/ui/hud/HandFan.tsx`: newly arrived hand cards start at their origin (deck pile, strip, discard) and run the draw sequence; the fan eases neighbours aside (reusing the Dock frame loop).
- `src/ui/hud/Panels.tsx` (`PlayStrip`, piles): strip cards fly in from their origin; pile elements expose their screen rects.
- `src/ui/scene/CardMesh.tsx` and `src/ui/layout.ts`: `place.from` for a newly appearing map card becomes its origin unprojected from screen space.
- `src/ui/hud/Investigators.tsx`: face-down flight to another investigator's token.
- `src/ui/styles.css`: flight and flip styles shared with the encounter flight.
- No engine changes: arrivals are derived from state changes in the UI.
