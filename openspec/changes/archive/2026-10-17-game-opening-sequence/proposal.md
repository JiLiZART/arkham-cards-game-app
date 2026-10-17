## Why

The start of a scenario is flat:
- The mulligan raises a card you pick, but nothing shows that it will be swapped, and a pick can't be undone.
- The act and agenda just appear in their corner panel. The scenario's story never shows, and only the current act can be opened.
- The scenario reference card is reachable only through the chaos bag.
- The starting location is simply there and already face up.
- Revealing a location when someone moves in is a quick damped turn that is easy to miss while the camera moves.

The opening should feel like setting up the real game on a table, in the style of the card animations already added.

## What Changes

- **Mulligan on the table.** A card picked for redraw flies out of the fan onto a "to redraw" row on the table, face up. Clicking it there flies it back into the hand. Confirming the redraw sends those cards into the deck and the new ones fly in as now.
- **Scenario introduction after the mulligan.** Once every investigator has kept or redrawn, the game introduces the scenario:
  1. the scenario name and intro text with the agenda card, shown large in the centre;
  2. the act card, shown the same way.

  The player reads each one and clicks Continue. Each card then flies to its place in the act/agenda panel.
- **Locations dealt onto the table.** After the act, the starting locations are dealt face down from the act/agenda panel onto the map, one after another. A location an investigator starts in then flips face up as their portrait lands on it. The table stays empty of locations during the mulligan.
- **A visible flip on reveal.** When a location is revealed later (an investigator moves in, or an effect reveals it), it lifts, turns over in 3D, and settles.
- **Locations placed later** (act advance, effects) arrive the same way: dealt face down from the act/agenda panel, then flipped if they come in revealed.
- **Act, agenda and reference card viewer.** The act/agenda panel gains the scenario reference card. Clicking any of the three opens a viewer with every act or agenda in order, current one first, and the reference card for the difficulty.
  - Acts and agendas already reached show both sides.
  - Upcoming ones show their front only, so the story on their backs isn't spoiled.
- **Engine:** the mulligan offers to take back a card picked for redraw, as long as Redraw hasn't been confirmed.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `game-table-ui`: new requirements Mulligan on the table, Scenario introduction, Location dealing and flips (also covers locations placed later, which the existing Card arrival animations already fly from the act panel), Act and agenda viewer.
- `investigator-decks`: Starting a scenario with a deck (a card picked for the mulligan can be taken back before confirming).

## Impact

- **Engine:** `src/engine/rules/investigators.ts` (`mulliganHandler`: un-pick option); `src/engine/bot.ts` (the bot never un-picks); engine tests.
- **UI:**
  - `src/ui/hud/HandFan.tsx` (picked cards leave the fan);
  - a new mulligan row and intro overlay in the HUD;
  - `src/ui/scene/Table.tsx` and `CardMesh.tsx` (hidden locations during setup, dealing, 3D flip);
  - `src/ui/hud/Panels.tsx` (reference card in the panel, the viewer);
  - `src/ui/arrivals.ts`;
  - `styles.css`;
  - en/ru strings.
- No content or save-format changes. Saved games and logs stay valid. A loaded game skips the introduction and shows its table as it is.
