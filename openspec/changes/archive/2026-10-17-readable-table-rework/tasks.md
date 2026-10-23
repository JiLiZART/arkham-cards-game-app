## 1. Assets and fonts

- [x] 1.1 Extend `scripts/extract-assets.sh`:
  - copy the new token PNGs under stable names (resource 1/3/5, clue 3, doom 3, damage/horror 3, lead, card back);
  - convert `table-bg.png` to `public/table/table-bg.jpg`;
  - copy `arkhamicons`, `tokens`, Teutonic, Teutonic RU and Alegreya fonts to `public/fonts/`;
  - generate `src/ui/glyphs.generated.json` (glyph name → code point) from the IcoMoon selection JSONs.

  Verify: re-run the script; the icon unit test confirms every mapped PNG and font file exists; a `dist/` build served without `inspired/` loads all of them.

- [x] 1.2 Add `@font-face` rules (`font-display: block` for the icon fonts) and a `<Glyph name>` component that falls back to the existing `GLYPHS` symbols when the font is unavailable. Switch `formatText` to glyphs for `[action] [reaction] [fast]/[free] [per_investigator] [bless] [curse]`. Draw numeric chaos tokens with the `tokens` font. Verify: unit test (Roland's text has the reaction glyph and no raw brackets; `2[per_investigator]` renders a glyph), plus a manual reveal of a −3 token.
- [x] 1.3 Add the table art.
  - Copy `card-back-bg.png`, `chaos-bag.png` and both `connector-*.png` into `public/` through the extract script.
  - Use the card back for encounter piles, face-down encounter cards and failed back images.
  - Draw the chaos bag as a textured plane and start token pops from it.
  - Draw a connector plaque at every link midpoint, rotated along the link.
  - Add an optional `oneWay` field to the scenario schema, using the one-way plaque and directed movement in `canMoveTo`.

  Verify: a schema and engine unit test (one-way A→B allows moving from A to B but not from B to A), a screenshot of The Gathering showing the plaques, bag and encounter back, and a manual skull reveal flying from the bag.

- [x] 1.4 Swap the board texture to the framed table background and use the card fonts for card names and the stat bar. Verify with a screenshot at 1600×900.

## 2. Board layout

- [x] 2.1 Re-tune `layout.ts` into regions:
  - left scenario strip: act and agenda rotated, piles stacked, today's size;
  - map with locations at 2×, falling back to no less than 1.6× when the grid doesn't fit;
  - viewer play area without the investigator card;
  - no placements for other investigators' cards; their engaged enemies sit at their location.

  Update `SAFE_INSETS` (right about 120, bottom about 230). Verify with `layout.test`: no overlaps for 1 to 4 players; everything inside the board; The Gathering locations at full 2× scale; no placement for the viewer's investigator card.

- [x] 2.2 Check on-screen sizes in the browser at 1600×900: every Gathering location is at least 150 px tall. Resizing to 1280×800 keeps the whole board visible. Verify with a screenshot.

- [x] 2.3 Replace the initials disc on locations with a small round portrait marker: investigator art cropped to the face, a class-coloured ring, a glow for the active investigator, the name on hover, and the initials as a fallback when the image fails. Keep several markers on one location apart. Verify with a screenshot of two investigators on one location, plus a check with images blocked.

- [x] 2.4 Drag to move:
  - the deciding investigator's own marker is draggable when move options exist;
  - while dragging, legal destinations are highlighted (from the `move` options) and the hovered one is emphasised;
  - dropping on one submits that Move option; dropping elsewhere or pressing Escape snaps back;
  - other investigators' markers don't drag.

  Write a pure `hitRect` with a unit test. Verify manually in The Gathering (Roland: Study → Hallway by drag; an illegal drop snaps back).

## 3. Options without the sidebar

- [x] 3.1 Add a pure `optionHome(option, game, viewer)` that returns `hand | board | strip | portrait | invModal | rail`. Verify with a unit test that runs a bot playthrough of The Gathering and asserts every option of every pending choice maps to a rendered home.
- [x] 3.2 Delete `Prompt`.
  - Add `PromptBanner` (top centre: who and question).
  - Add `ActionRail`: right side, options with no card, an icon and translated label per `value.kind`, the primary option styled, hidden during hand-off.
  - Move `SkillTestPanel` under the banner.

  Verify manually: on Roland's turn the rail shows Draw, Resource and End turn with icons, and Investigate and Move are only on the map.

- [x] 3.3 Add a `CardModal` (`<dialog>`) that opens from scenario-strip cards and the stat-bar portrait. It shows the full-size card, its tokens, and buttons for its options; it closes on Escape or a backdrop click. Highlight strip cards that have options. Verify manually: advance the act through the modal, and open the agenda read-only.

## 4. Hand fan and stat bar

- [x] 4.1 Make hand cards 300×420. At rest about 45% of each card shows. Hover raises the card fully into view. Cards with an option in the pending choice rise halfway and are highlighted (play, commit, mulligan). Update the `fanLayout` tests for the new width (12 cards, at least 40 px each). Verify manually: in a commit window only the committable cards rise, and clicking one commits it.
- [x] 4.2 Rebuild `StatBar`: 120 px portrait that opens the modal, 44 px stat icons, translated `title`/`aria-label` tooltips on every item (for example "Health 7 / 9"). Verify manually by hovering each stat.
- [x] 4.3 Add `TokenStack` above the stat bar for resources (5/3/1) and clues (3/1), with its total and a tooltip. Write the greedy decomposition as a pure function with a unit test: 9 → 5+3+1, 4 → 3+1, 0 → none. Verify manually: gaining a resource re-stacks the tokens.
- [x] 4.4 Replace `PlayerPlaques` with an `InvTokens` column on the right edge. Each token is a portrait plus clue, resource, health and sanity counts with tooltips; the active one is highlighted, defeated ones are greyed, and a token with pending options is highlighted. Clicking a token opens `InvModal` with stats like the stat bar, the investigator card, the hand, cards in play, the threat area, and buttons for pending options. Verify manually in a 3-player game: open Daisy's modal and see her hand and assets; choose her for an investigator choice; the board shows none of her cards.

## 5. Reused translations

- [x] 5.1 Write `scripts/import-i18n.ts --locale ru`. It reads the ArkhamCards `generated/*_ru.txt` and `ru.po.json`, and writes `content/i18n/ru/{campaigns,ui}.generated.json` covering NotZ campaign and scenario names, encounter sets, log titles, narrative, and UI labels matched by msgid. Add an optional `i18nId` to the scenario JSONs. Verify: The Gathering shows its Russian name with `ru`, and `npm run check:content` passes.
- [x] 5.2 Add `--locale ru` to `scripts/import-cards.ts` to write `content/i18n/ru/cards.generated.json` from ArkhamDB's Russian API, keeping the old file and exiting non-zero on network errors. Make the loader merge `*.generated.json` under the hand-written files. Verify with a unit test that a hand-written string wins over a generated one, and manually that Machete reads in Russian.

## 6. Verification

- [x] 6.1 Play a 2-investigator Gathering round in the browser at 1600×900 through hand-off, the commit window, act advance and the enemy phase, using only cards, the rail and the modal. Confirm no console errors and record screenshots. Switch to `ru` and confirm the stat tooltips, rail labels and scenario name are in Russian.
- [x] 6.2 Run `npm test`, `npm run lint`, `npm run build` and `npm run check:content`, and confirm they all pass. Update the README notes on assets, fonts and i18n sources.
