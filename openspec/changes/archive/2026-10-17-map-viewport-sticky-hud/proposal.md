## Why

The board is still hard to play on. One fixed camera has to fit the whole map, the scenario strip, the play area and the HUD. So locations stay small, the play area takes space from the map, and the act and agenda turned sideways are awkward to read. Hovering a card opens a side panel in the top-right corner, far from the card being looked at. Stat numbers in the bottom-left are too small to read at a glance.

## What Changes

- **BREAKING (UI):** the table becomes a map viewport that fills the full window.
  - It holds only the location map: locations, connections, enemies and attachments on locations, and investigator portraits.
  - It can be dragged to pan and scrolled or pinched to zoom, within limits.
  - By default the camera centres on the active investigator's location, zoomed so that card is about hand-card size (≈420 px tall at 1080p).
  - The camera re-centres when the deciding investigator changes or moves.
  - Two small controls, "Focus" and "Whole map", jump between the default view and the zoomed-out map.
  - Dragging your portrait to move works at any zoom.
- **Fixed HUD panels**, drawn as page elements over the map, that never move with it:
  - **Top-left:** the act and agenda as small landscape cards, the right way up again. Clicking one opens a modal with both sides of the card (front and back).
  - **Left side, below them:** encounter deck, encounter discard, victory display, then your deck and discard, as small piles with counts.
  - **Top-right corner:** the chaos bag. Clicking it opens a modal listing every token in the bag with its count, next to the scenario reference card that explains the special tokens.
  - **Bottom, above the hand:** your play area and threat area as a strip of small cards (your choice of "Sticky strip").
  - The other investigators' portrait tokens stay on the right, now under the chaos bag.
- **BREAKING (UI): hover enlarges the card in place.** The top-right zoom panel goes away.
  - Hovering any card shows it at twice its on-screen size, on the spot, with its details below it: name, traits, text and tokens.
  - This covers locations, enemies and attachments on locations, HUD panel cards and play-strip cards.
- **Hand:** hovering a hand card shows it at 1.6× its resting size, about 480×672 px, kept within the window height.
- **Stat bar:** every number in the bottom-left panel (health, sanity, actions, skills, resource and clue totals) is at least 38 px tall, the name larger, with the investigator's ability and its option buttons under it.
- **Icons from the font.** Every concept the ArkhamCards `arkhamicons`, `arkhamslim` and `tokens` fonts cover is drawn as a font glyph instead of a PNG, coloured like the printed icons. That covers skills, classes, health, sanity, slots, action, reaction and fast symbols, and every chaos token, including skull, cultist and the others.
  - PNGs remain only for physical token art (damage, horror, clue, doom, resource 1/3/5), the lead token, the card back, the chaos bag and the connector plaques.
  - `arkhamslim` (the thinner variant) is used for small and inline icons, and `arkhamicons` for large ones.
  - `blood` and `standalone` are added for the glyphs only they have: the blood chaos token and its encounter-set icons, and the standalone scenario, encounter-set and starter-deck icons. They are ready for when that content arrives. `tokens` draws every chaos token.
  - Those PNGs get transparent backgrounds instead of white boxes.
- **Official card backs** from the ArkhamCards assets:
  - the sepia tentacle art (ArkhamCards' `encounter-back.png`) becomes the player card back, replacing the drawn placeholder;
  - the blue eclipse art (ArkhamCards' `player-back.png`) becomes a sharper encounter card back.
  - The two files are mapped by their artwork, because their names are swapped compared with the printed game.
- **Chaos token draw.** When a skill test reveals a token:
  - the bag appears in the centre of the screen, with one white circle per token in it;
  - you click a circle, the bag fades, and the circle flies to the table and turns into the revealed token;
  - a result panel then shows the calculation step by step: skill, modifiers, committed icons, token, total against the difficulty, and Success or Fail.

  Which token comes out is still decided by the engine's seeded draw, so replays and saved games stay exact; the click stages the reveal. A menu setting turns the click off for an automatic reveal.

- Committed skill cards and the encounter card being resolved move out of the map into the skill-test panel and a centred overlay, since the map can be scrolled away from them.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-table-ui`:
  - modified: "Table layout" (full-width map viewport plus fixed HUD panels), "Card interaction" (hover enlarges in place; act and agenda show both sides), "Hand fan" (2× on hover), "Stat bar" (numbers at least 48 px), "Card detail modal" (both sides for act and agenda), "Drag to move" (at any zoom) and "Other investigators" (now under the chaos bag);
  - also modified: "Prompts and choices" (the reveal goes through the token draw);
  - added: "Map viewport", "Scenario and deck panels", "Chaos bag modal", "Hover enlarge", "Play area strip" and "Chaos token draw".
- `game-iconography`:
  - modified: "Table art" (the chaos bag and encounter back now appear in the HUD; connectors stay on the map) and "Icon font" (the font is used first wherever it has a glyph);
  - added: "Transparent icon art".

## Impact

- **UI code:**
  - `src/ui/scene/Table.tsx`: camera controls, focus and fit, and pointer handling to tell drag from click;
  - `src/ui/layout.ts`: map only; the strip and viewer areas are removed;
  - `src/ui/scene/EventFx.tsx`: the encounter flight and token pop become page overlays;
  - `src/ui/hud/*`: new panels, the chaos bag modal, the hover overlay and the play strip; CSS updates.
- **Unchanged:**
  - the engine and content;
  - the `optionHome` mapping: "board" now means map or play strip, and "strip" means the HUD panels.
- **Order:** this change edits requirements written by `readable-table-rework`. Archive the earlier changes first, in order.
