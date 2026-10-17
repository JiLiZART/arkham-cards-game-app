## Why

An encounter card drawn in the mythos phase flies to a 260 px spot under the banner, holds for 1.4 seconds and is gone: its enemy is suddenly on the map, its treachery has already hurt someone, and the player does not know what happened. Cards drawn into the hand already stop in a large showcase until the player taps them; a drawn encounter card, which the player has to read and which changes the table, deserves the same pause.

## What Changes

- **Encounter cards and weaknesses stop in the showcase.** A card drawn from the encounter deck (a mythos draw, surge, an effect that draws one) and a weakness drawn from a player deck rise out of their pile, turn face up and stand large in the middle of the screen, with the hand-card details on hover and a line saying what to do. Nothing happens on the table until the player taps the card, presses Continue, or presses Space or Enter.
- **The tap sends the card on its way.** After it, the card flies from where it stood to where it goes next: an enemy glides to its spawn location, an attachment to its target, a treachery with a choice to the resolving spot under the banner, a treachery with a test into the skill-test screen as its subject, and a finished treachery to the discard pile. The events that follow (damage, horror, doom, the test) play after the tap, never before it.
- **Held at every pace.** Normal and Slow no longer time the reveal; the Tap pace's Next moves to the overlay as its Continue button. The pace setting still governs everything else.
- **One at a time.** Each investigator's draw in the mythos phase is shown and tapped in turn; surge draws follow the card that caused them.
- The engine announces a drawn weakness as its own event (today it is a plain draw), so the table can show it; the feed gets a line for it.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-table-ui`: ADDED "Encounter card showcase"; MODIFIED "Animations follow the event log" (the encounter draw waits for the tap), "Pace setting" (the reveal is held at every pace), "Card arrival animations" (weaknesses are showcased; arrivals leave from the showcased card).
- `action-feed`: no requirement change; the new weakness event gets a feed line through the existing mechanism (recorded in design).

## Impact

- UI: `src/ui/hud/Reveal.tsx` (the flight becomes a showcase overlay), `src/ui/hud/Hud.tsx` (EventPlayer: held events, stage), `src/ui/store.ts` (`needsNext`/held set), `src/ui/hud/StepCaption.tsx`, `src/ui/arrivals.ts` (origin from the showcased card), `src/ui/scene/Table.tsx` (spawn hold covers weaknesses), `styles.css`, en and ru strings.
- Engine: `src/engine/rules/investigators.ts` emits `weakness` instead of `draw` for a weakness drawn; log only, no state or save format change; feed string in en and ru.
- Scripts and docs: `drive-calm.js` learns to tap the showcased encounter card; a new `check-encounter-showcase.js`; README play notes.
