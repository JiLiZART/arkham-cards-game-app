## Why

Two pointer habits get in the way. Hovering the act, the agenda or the scenario reference card in the panel pops an enlarged copy with a details column over the table, although a tap already opens the viewer with the whole deck; the enlargement covers the map for nothing. In the player bar a click on the avatar of the investigator on screen opens their sheet, so a click meant to return to that investigator or to dismiss something opens a popup instead, while looking at a teammate's sheet takes a click, then another click to close it.

## What Changes

- The act, agenda and scenario reference cards in the panel no longer enlarge on hover; the hover still highlights the card, and a tap opens the viewer as before. Every other hover enlargement stays.
- In the player bar a click on any avatar only changes whose table is shown (a click on the investigator already on screen does nothing); it never opens the sheet. Resting the mouse on the avatar of an investigator who is not on screen for 500 ms opens their sheet, which closes when the pointer leaves the avatar and the sheet. On a touch screen, where there is no hover, a tap on the avatar of the investigator on screen opens their sheet, as today.
- Unchanged: a pulsing avatar (someone who can act) and a lit avatar that answers a choice keep their tap behaviour; the investigator's own ability button stays in the stat bar.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-table-ui`: hover enlargement without the scenario panel's cards; the player bar's click and hover behaviour.

## Impact

- `src/ui/hud/Panels.tsx` (no hover props on the scenario cards), `src/ui/hud/PlayerBar.tsx` (click and hover logic, a hover timer in view state), `src/ui/touch.ts` or the bar's pointer-type check, styles; the browser scripts that open the sheet by clicking (`check-bar.js`, `check-players.js`, `drive*.js`).
- No engine change.
