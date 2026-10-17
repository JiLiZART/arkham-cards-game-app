## 1. Map-only layout and camera

- [x] 1.1 Reduce `layout()` to the map: locations, connections, things at locations (other investigators' engaged enemies with a badge), minis, and `bounds`. Drop the strip and viewer regions, `BOARD` and `SAFE_INSETS`. Size the table background to `bounds`. Verify with `layout.test` for 1 to 4 players in all three scenarios: no overlaps, everything inside `bounds`, nothing of the viewer's on the map except minis.
- [x] 1.2 Add `MapCamera` with eased `{cx, cz, zoom}`:
  - drag to pan, with a 5 px threshold and click suppression;
  - wheel zoom anchored at the pointer, and pinch zoom;
  - zoom limits (whole map at the far end, a location 840 px tall at the near end) and a pan clamp;
  - put the clamp, anchored-zoom and focus-zoom math in pure helpers with unit tests.

  Verify manually: dragging pans without clicking, the wheel zooms around the cursor, and the limits hold.
- [x] 1.3 Default focus: glide to the deciding investigator's location at about 420 px tall (scaled to the window height). Re-centre when the decider changes or moves, unless the player panned or zoomed in the last 1.5 s. Add "Focus" and "Whole map" buttons. Verify manually at 1920×1080: the Study is centred about 420 px tall at turn start, the camera follows a hand-off to Daisy in another location, and "Whole map" fits The Midnight Masks.
- [x] 1.4 Keep drag-to-move working at any zoom: dragging a portrait never pans, and the legal highlights and drop still work. Verify manually by zooming out fully and dragging Roland's portrait to a connected location.

## 2. HUD panels

- [x] 2.1 Add `ScenarioPanel` at the top-left: act and agenda as small landscape cards with doom and clue badges and a legal highlight. Clicking one opens `CardModal` in a new both-sides mode (front and back side by side). Verify manually: advance the act through the modal, and open the agenda read-only showing both sides.
- [x] 2.2 Add `PileColumn` on the left: encounter deck (card back), encounter discard, victory, side decks, then the viewer's deck and discard, each with a count. Clicking a face-up pile opens its top card. Verify with a screenshot while panned far away: the panels haven't moved.
- [x] 2.3 Move the chaos bag to the top-right corner and add `ChaosBagModal` (tokens grouped with icon and count, plus the scenario reference card for the difficulty). Move `InvTokens` below the bag. Verify with a unit test for the token grouping (The Gathering on Standard gives +1×1, 0×2, −1×3, −2×2, −3×1, −4×1, skull×2, cultist×1, tablet×1, auto-fail×1, elder sign×1) and a screenshot of the modal.
- [x] 2.4 Add `PlayStrip` above the hand: the viewer's assets, then a separator and the threat area and engaged enemies. Exhausted cards turn sideways, token badges show, and legal cards are highlighted. Clicks go through a shared `useCardClick()` that is also used by the map. Adjust the fan's legal raise so raised cards stop below the strip. Verify manually: fight an engaged enemy from the strip, and use an asset ability from the strip.
- [x] 2.5 Turn the encounter flight, the resolving card and the token pop into DOM overlays animated from the pile and bag rects, and show committed cards in `SkillTestPanel`. Verify manually: the mythos encounter draw and a skull reveal animate from their HUD positions.

## 3. Hover and readability

- [x] 3.1 Add a `HoverCard` overlay: 2× the hovered card's on-screen rect, centred, with a details panel below, clamped to the viewport by a pure `placeHover()` with unit tests (centre, right edge, bottom edge). Wire it to map cards (projected rects, updated on camera moves) and to every DOM card in the panels and strip. Delete `CardZoom`. Verify manually: hover a location, an enemy on a location, the agenda and a strip card; none opens a top-right panel.
- [x] 3.2 Hand hover at 2×: scale `k = min(2, (innerHeight − 16) / 420)` from bottom-centre, fully on screen, above the strip and dock. Relax the 12-card fan test to at least 32 px visible at 1280 px. Verify manually at 1920×1080 (about 840 px tall) and 1280×800 (fits the height).
- [x] 3.3 Stat bar numbers at least 48 px (health, sanity, actions, skills, resource and clue totals), max values smaller, three-row layout, and `STAT_BAR_W` updated. Verify in the browser that the computed `font-size` is at least 48 px for each number and nothing overlaps the play strip or fan at 1280×800.

- [x] 3.4 Chaos token draw:
  - `TokenDraw` overlay: the bag in the centre with white circles laid out by a pure `circleLayout`; click, Space or Enter picks a circle; the bag fades and the circle flies beside the skill-test panel and flips into the revealed token; `EventPlayer` waits for this instead of its timer.
  - `TestBreakdown` result panel built by a pure `breakdownRows(testResult data)`, with a Continue button.
  - A "Draw chaos tokens by hand" menu setting (default on, saved) for automatic reveal.

  Verify with unit tests (`circleLayout` with no overlaps for 16 and 30 circles; `breakdownRows` for success, fail, auto-fail and a two-token test; replaying a log gives the same tokens whatever circles are clicked) and manually: investigate, click a circle, watch the token land, read the breakdown, Continue; then turn the setting off and confirm an automatic reveal.

## 4. Icons

- [x] 4.1 Turn the extract script's fonts into a `FONTS` list (`arkhamicons`, `arkhamslim`, `tokens`, `blood`, `standalone`, each with its IcoMoon json) that copies each ttf, writes one combined glyph map and gets one `@font-face` per font, with the lookup falling through the fonts (blood token and its set icons come from `blood`, standalone scenario, set and starter-deck icons from `standalone`), plus `setIcon(code)` for encounter-set and scenario icons, unit-tested with `curse_of_the_rougarou` resolving to `standalone` and `skull` to `arkhamicons`; small and inline icons (24 px or less, and all `formatText` markup) use `arkhamslim`, larger ones `arkhamicons`, each falling back to the other for missing names. Switch `icons.ts` and `<Icon>` to font first: glyphs with official colours for skills, classes, health, sanity, slots and action symbols. Generalise `ChaosTokenIcon` to draw every chaos token from the tokens font's layers. Route `formatText` markup through the same table. Remove the skill, class, chaos-token and slot PNGs and their copy lines. Verify with an icon test (every name resolves to an existing glyph or an existing PNG; no PNG left for a concept the font has) and screenshots of the stat bar, a skull reveal and a card's text.
- [x] 4.2 Make the remaining token PNGs transparent in `extract-assets.sh` (corner flood-fill for damage, horror, clue, doom, resource 1/3/5 and lead) and re-run it. Verify with a node test that each remaining icon PNG has an alpha channel and a transparent corner pixel, and a screenshot of the token stacks on the dark stat panel showing no white boxes.

- [x] 4.3 Card backs: copy ArkhamCards' two back images into `public/table`, mapped by artwork (sepia tentacles become the player back with rounded corners, blue eclipse the encounter back). Use them for WebGL textures, DOM piles and failed back scans, and remove the drawn "ARKHAM" back and `card-back-bg`. Verify with the asset test (both files exist, the player back has transparent corners) and a screenshot of the left panel showing both backs.

## 5. Verification

- [x] 5.1 Update the scripted UI playthrough (drive.js) for the new HUD: pan before clicks, the act through the panel, fights from the strip, click a circle in every token draw and press Continue. Play two rounds of The Gathering with 2 investigators and privacy on at 1600×900. Confirm no console errors and capture screenshots of the default focus view, the whole map, the hover overlay, the chaos bag modal and the act modal.
- [x] 5.2 Run `npm test`, `npm run lint`, `npm run build` and `npm run check:content`, and confirm they all pass. Update the README's play notes (pan, zoom, Focus and Whole map).
