## Why

Card text is still too small to read during play. On a 1600×900 window, a hand card at rest is 210 px tall and a location on the board is about 80 px. The right-hand action sidebar takes 344 px and repeats things that could be done on the cards themselves. The investigator card on the board repeats what the stat bar shows, and the stat icons are too small to tell apart.

The `inspired/` folder now also contains resources we don't use yet:

- ArkhamCards' icon fonts, which have proper action, reaction, fast, health and sanity glyphs and every chaos token;
- its card fonts;
- Russian strings for campaigns, scenarios, encounter sets and UI labels;
- new table art and token art in `inspired/icons`.

## What Changes

- **Bigger cards:**
  - Hand cards are 2× their current size, at rest and when raised on hover.
  - Location (map) cards are drawn at 2× their current on-screen size, together with the enemies and tokens on them.
- **Map markers:** on location cards, each investigator's initials disc (such as "DW") is replaced by a small round portrait of that investigator.
- **Drag to move:** on your turn you can drag your own portrait from its location to another. While you drag, every location you can legally move to is highlighted, and dropping on one takes the Move action.
- **Scenario cards move to a narrow strip on the left**, at about today's size. The strip holds the act, agenda, scenario reference, encounter deck and discard, victory display and chaos bag; the act and agenda may be turned sideways. Clicking one opens a modal with the card at full size, its tokens, and the actions it offers (for example "Advance act" or an ability), so you can pick one there.
- **BREAKING (UI):** the investigator card is removed from the viewer's play area. The stat bar in the bottom-left corner replaces it:
  - a larger portrait (about 2×);
  - larger stat icons (about 2×);
  - a tooltip on every stat item that names it, e.g. "Health 7 / 9";
  - clicking the portrait opens the investigator card in the modal;
  - resources and clues move to a row above the stat bar, drawn as stacks of physical tokens rather than icon plus number:
    - resources use the 5, 3 and 1 tokens, fewest tokens first, so 8 shows as 5 + 3;
    - clues use the 3 and 1 tokens, since there is no 5-clue art;
    - each stack also shows its total and has a tooltip.
- **BREAKING (UI): other investigators leave the board.**
  - Each one is shown only as a portrait on the right side, with clue, resource, health and sanity counts beside it.
  - Clicking the portrait opens a modal with that investigator's stats (laid out like your stat bar), hand, cards in play and threat area, plus any choices that involve them.
  - Their engaged enemies stay on the map at their location.
  - The top-bar plaques are removed.
- **BREAKING (UI):** the right-hand action sidebar is removed. Actions are offered in your own area instead:
  - an action tied to a card in your hand makes that card rise slightly above the fan, marked as playable;
  - an action tied to a card on the board (a location, an enemy, an asset in play) highlights that card;
  - an action not tied to any card shows as an icon button with a label on the right side, next to the hand. Examples are Draw, Gain resource, End turn, Done, Skip and Mulligan.
  - A one-line prompt banner still says who is deciding and what the choice is about.
- **Icons:**
  - The ArkhamCards icon fonts (`arkhamicons`, `arkhamslim`, `tokens`) and their configs are added and used for glyphs that have no PNG art. Today those use ➤ ↺ ⚡ placeholders.
  - The new PNGs from `inspired/icons` are used: 3-value damage, horror, doom, clue and resource tokens, the lead-investigator token and the green-framed table background.
  - Table art:
    - `card-back-bg.png` is the encounter card back: on the encounter deck pile, on face-down encounter cards, and as the fallback when a card's back scan fails to load;
    - `inspired/chaos-bag.png` is the chaos bag on the board, and the reveal animation starts from it;
    - `connector-both-ways.png` is a plaque at the middle of each location connection, turned along the link;
    - `connector-one-way-from-left-to-right.png` marks one-way connections, which scenarios can now declare.
  - Card names and the stat bar use the ArkhamCards card fonts (Teutonic for titles, with Teutonic RU for Russian; Alegreya for body text).
- **Russian text:** Russian strings are imported from ArkhamCards into our locale files:
  - campaign and scenario names;
  - encounter set names;
  - campaign log section titles;
  - Night of the Zealot narrative text;
  - matching UI labels from `ru.po` (Health, Sanity, Resources, action names).

  An import script regenerates them. ArkhamCards' card database is English-only, so Russian card text for the core set is fetched from ArkhamDB's Russian API by the existing card importer.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-table-ui`:
  - modified: "Table layout" (left scenario strip, 2× locations, no viewer investigator card, no action sidebar), "Card interaction", "Prompts and choices", "Hand fan" (2× cards, playable cards raised) and "Stat bar" (bigger portrait and icons, tooltips, token stacks; no plaques);
  - added: "Action rail", "Card detail modal" "Other investigators" (portrait tokens and investigator modal) "Investigator markers on the map" and "Drag to move".
- `game-iconography`:
  - modified: "Rules text icons" (icon font glyphs replace placeholder symbols);
  - added: "Icon font".
- `card-content`:
  - added: "Reused translations", for strings imported from ArkhamCards and ArkhamDB.

## Impact

- **UI code:**
  - `src/ui/layout.ts`: new regions, location scale, and no viewer investigator card;
  - `src/ui/safeArea.ts`: the right inset shrinks;
  - `src/ui/hud/HandFan.tsx` and `fan.ts`: card size and the raise for playable cards;
  - `src/ui/hud/Stats.tsx`: the stat bar;
  - `src/ui/hud/Hud.tsx`: `Prompt` is replaced by the action rail and banner, and a card modal is added;
  - `src/ui/icons.ts`, `src/ui/Icon.tsx` and the CSS.
- **New assets:**
  - `public/fonts/` for the icon and card fonts;
  - `public/icons/` gains the new token PNGs;
  - `public/table/` gains the framed background.
  - `scripts/extract-assets.sh` is extended to produce them.
- **Content:**
  - a new `scripts/import-i18n.ts` writes `content/i18n/ru/{ui,campaigns}.json`;
  - `scripts/import-cards.ts` gets a `--locale ru` mode that writes `content/i18n/ru/cards.json`.
- **Unchanged:** engine and rules, and saves. The engine's `ChoiceOption` already carries `card`; the option kind is inferred in the UI, as `groupOptions` does today.
- **Order:** this change edits requirements introduced by `add-core-game-engine` and `flat-hearthstone-table`. Archive those two first.
- **Licensing:** the fonts and strings come from ArkhamCards and stay for personal use like the existing card scans. The README notes the source.
