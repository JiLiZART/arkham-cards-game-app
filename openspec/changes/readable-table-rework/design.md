## Context

This builds on `flat-hearthstone-table`: a fixed orthographic board fitted into `SAFE_INSETS` (top 52, right 344, bottom 178), an HTML `HandFan`, a `StatBar` and `PlayerPlaques`, and a right column holding `SkillTestPanel` and `Prompt`. `Prompt` lists every option of `game.pending`, grouped by matching on the label.

The engine already tags most options with `card`:
- locations: move and investigate;
- enemies: fight, evade and engage;
- hand cards: play, commit and mulligan;
- cards in play: abilities;
- the act: advance;
- investigator cards: when an investigator is the target.

Options with no card are draw, resource, end turn, done/pass/keep hand, skill choice, "Choose one" and "Take nothing". The engine needs no change.

Measured at 1600×900:
- the board scale is about 40 px per world unit;
- a location is 1.96 units, about 80 px;
- a hand card is 150×210 px.

New sources in `inspired/`:
- `icons/`:
  - `table-bg.png` (2275×1495, the parchment with a green frame);
  - `token-resource-{1,3,5}`, `token-clue-trhee` (3 clues), `token-doom-three`, `damage/horror-token-three`;
  - `token-lead-player`, `connector-*`, `card-back-bg`.
- `ArkhamCards/assets`:
  - IcoMoon fonts with selection configs: `arkhamicons` (108 glyphs including action, reaction, free, health, sanity, per_investigator, slots, skills, classes and tokens), `arkhamslim` and `tokens` (chaos token fill, overlay and highlight layers for −8..+1);
  - card fonts: `Teutonic`, `Teutonic RU`, `Alegreya`, `Arkhamic`;
  - `generated/*_ru.txt`: JSON for campaigns, scenario names, encounter sets and campaign logs;
  - `i18n/ru.po(.json)`: 2,601 UI strings;
  - `arkham4.db`: English-only card data.

## Goals / Non-Goals

**Goals:**
- Hand cards and locations about 2× larger on screen. Everything else on the board gets smaller to make room.
- Every pending option reachable without a sidebar.
- One glyph source for all symbols that have no PNG.

**Non-Goals:**
- Engine or rules changes, apart from the optional one-way connections in Decision 6.
- Panning or zooming the board. The camera stays fixed; the user chose to shrink the scenario cards instead.
- Translations for languages other than Russian. The import script takes a locale argument, but only `ru` is run and checked.
- Mobile layouts.

## Decisions

### 1. Board regions and fit
`SAFE_INSETS.right` drops from 344 to about 120 (the action rail), and `bottom` grows to about 230 for the bigger hand band. `layout()` splits the board into regions:

```
┌──────┬──────────────────────────────┬────────┐
│ scen │                              │ inv    │
│ strip│        location map          │ invs   │
│(act, │     (locations S×2, enemies  │ tokens │
│agenda│      and minis on them)      │(portr. │
│ enc, │                              │+counts)│
│ bag) ├──────────────────────────────┤        │
│      │ viewer play area / threat    │        │
└──────┴──────────────────────────────┴────────┘
   stat bar ◄── hand fan (DOM) ──► action rail
```

- The scenario strip is about 3.2 units wide:
  - act and agenda are rotated 90° so they fit;
  - piles are stacked vertically;
  - cards are drawn at about today's size.
- Location scale is `S_LOC = 2·S`.
- `CELL` grows to fit; enemies and minis at a location scale with it.
- If a scenario's grid doesn't fit the map region, `layout()` shrinks `S_LOC` down to `1.6·S` to fit, never lower. A test checks that NotZ scenario 1 fits at the full 2×.
- Other investigators get no board placements at all: no investigator card, piles, play area or threat area. `layout()` places cards only for the viewer, the map and the strip.
  - Enemies engaged with another investigator are placed at that investigator's location, with a small portrait badge.
  - The right column is DOM rather than WebGL: `InvTokens` replaces the `PlayerPlaques` in the top bar. It reserves about 150 px in `SAFE_INSETS.right` above the action rail.
  - Each token is a 64 px portrait with a vertical stack of 4 `Stat`s (clue, resource, health, sanity). It reuses `invNumbers`, `FlashStat` and the tooltips.
  - Click opens `InvModal`: a `<dialog>` that reuses the stat bar body (stats plus `TokenStack`) and shows the investigator card, the hand as a row of full-size cards (wrapping), cards in play and the threat area, plus buttons for pending options tied to any of them.
  - Showing teammates' hands is allowed: the game is cooperative and players may share their hands. Hand-off privacy only covers the hand-off screen, so the modal is unavailable while that screen is up.
- The viewer's area holds no investigator card: `layout()` skips `cardId` when `inv === viewer`. The engine still has the card. Options targeting it are routed to the stat-bar portrait (see 4).

*Alternative:* a board larger than the screen with panning. Rejected by the user in favour of shrinking the scenario cards.

### 2. Hand fan 2×
- `FAN_CARD_W/H` go to 300×420.
- At rest, about 45% of each card shows above the bottom edge (`translateY` ≈ 230 px). On hover, it is raised to full height with no extra scale, because the card is already the readable size.
- A card that has an option rises halfway: `.legal` plus `translateY(-120px)`. This is the visual for "if the action is a card, move up the cards that can be played". It applies to every choice kind: play, commit, mulligan and discard-to-hand-size.
- The fan width is the space between the stat bar (about 300 px) and the rail.
- `fanLayout` already tightens with `n`. The 12-card test is updated to the new width, keeping at least 40 px visible per card.

### 2b. Portrait markers on locations
- `Mini` in `Table.tsx` currently draws an initials disc ("DW") as `Html`. It switches to the same `Portrait` used by the stat bar and the tokens: a `div` with the investigator card image as background, cropped with `background-position` on the face, `border-radius: 50%`, and a ring in the class colour from `FACTION_COLORS`.
- The marker is about 40 px, scaled with the location size.
- The active investigator gets the existing glow.
- `title` shows the name.
- If the image fails, the initials disc stays as the fallback.
- The offsets already in `layout()` keep several markers apart. They are re-checked at the 2× location size.

### 2c. Drag a portrait to move
- The marker is DOM (drei `Html`), so the drag uses pointer events on it, the same pattern as the `HandFan` drag. While dragging, the portrait follows the cursor in a fixed-position overlay.
- **Legal drops** are the pending options with `value.kind === "move"` for the deciding investigator; their `card` is the destination. A marker is draggable only when it belongs to `pending.inv` and at least one such option exists.
- **Hit test:** on drag start, `Table` projects each location placement's four corners through the orthographic camera into screen rects and stores them in `useView` (`dropRects`). A pure `hitRect(x, y, rects)` returns the location under the pointer. The camera is fixed, so the rects stay valid for the whole drag.
- **Highlight:** `useView.dragMoveTargets` (a set of location ids) makes `CardMesh` show the legal glow on those locations. The hovered legal target gets a stronger glow.
- **Drop:** on a target, `choose(moveOption.id)`. Otherwise, or on Escape, the drag is cancelled. A press that moves less than 6 px is treated as a click.

*Alternative:* raycast the WebGL scene on every pointer move. Rejected: projected rects are simpler, and they are pure and testable.

### 3. Action rail replaces `Prompt`
- `Prompt` is deleted.
- `PromptBanner` sits top-centre under the top bar and shows "<who>: <prompt>" on one line.
- `ActionRail` sits on the right and renders `pending.options.filter(o => !o.card)`.
- Icon and label come from the option's `value.kind` when it exists, otherwise from the id or label:

  ```
  draw→card-back, resource→token-resource-1, endTurn/done/pass→arkhamicons "x" or arrow,
  skill choice ("Test willpower")→skill icon, generic→numbered bullet
  ```

  Labels for known kinds go through `t()`. Unknown labels show the engine text.
- `SkillTestPanel` stays and floats top-right under the banner.
- Options with a `card` are reached on that card:
  - hand cards: in the fan;
  - board cards: click on the board, using the existing highlight and `PopupMenu` when there are several options;
  - scenario-strip cards: in the modal;
  - viewer investigator card: on the portrait;
  - other investigators and their cards: in their token's modal; the token is highlighted while such options exist. An option whose only card is the other investigator's own card ("choose an investigator") is also a quick click on the token.
- A pure helper, `optionHome(option, game, viewer)`, returns `"hand" | "board" | "strip" | "portrait" | "invModal" | "rail"`. A unit test runs a bot playthrough of The Gathering and asserts that every option of every pending choice resolves to a home that is actually rendered. This is the "every option reachable" check.

### 4. Card detail modal
- `CardModal` is one DOM dialog driven by the `useView` state `modal: InstId | null`.
- It shows the image (or text face) at about 70vh, the tokens on the card, and buttons for the pending options with `card === id`.
- It opens on a click on a strip card or the portrait.
- It uses `<dialog>` with `showModal()`, which gives Escape and focus trapping natively; a click on the backdrop closes it.
- Strip cards with options get the existing legal highlight, so the player knows to open them.

### 5. Stat bar
- Portrait 120 px, stat icons 44 px, health and sanity as remaining/max, actions, skills.
- Every `Stat` gets `title` and `aria-label`: "Health 7 / 9", translated with `t()`. A native `title` is the tooltip; no tooltip library.
- `TokenStack({ kind, value })` sits above the bar:
  - `resource`: denominations [5, 3, 1];
  - `clue`: [3, 1] (`evidence-coin` for 1, `token-clue-three` for 3).
  - Tokens are greedy-decomposed, drawn overlapped with a slight offset, and followed by the total.
  - The decomposition is a pure function with a unit test (9 → 5+3+1, 4 → 3+1, 0 → empty).
- Plaques keep their compact icons and get the same tooltips.

### 6. Icon fonts
- `scripts/extract-assets.sh` copies `arkhamicons.ttf`, `tokens.ttf`, `Teutonic.ttf`, `Teutonic RU.ttf` and `Alegreya-*.ttf` into `public/fonts/`. It writes glyph maps `src/ui/glyphs.generated.json` (name → code point) from the IcoMoon selection JSONs, so no code points are hard-coded.
- `@font-face` uses `font-display: block` for the icon fonts. That avoids flashing wrong letters, because the glyphs sit on ASCII code points.
- `<Glyph name>` renders a `span` in the icon font. If `document.fonts.check()` fails after load, it renders the old `GLYPHS` fallback symbol.
- `formatText` maps `[action] [reaction] [fast]/[free] [per_investigator] [bless] [curse]` to glyphs, and keeps PNGs for skills, tokens and classes.
- Numeric chaos tokens use the `tokens` font, layering `token_number_fill` and `token_-3_highlight`, instead of the CSS disc.
- New PNGs (`token-resource-{1,3,5}`, `token-clue-three`, `token-doom-three`, `damage/horror-3`, `lead`, `card-back`) are copied with stable names. The misspelt `trhee` source is renamed.
- Table art:
  - **Card back.** `card-back-bg.png` is used:
    - as the texture for encounter piles;
    - for face-down encounter cards;
    - as the `onError` back for any card. Player-card backs still come from the CDN.
  - **Chaos bag.** `inspired/chaos-bag.png` (139×118) becomes a textured plane at the chaos bag spot in the strip, replacing the drawn bag. `EventFx` token pops start at its position.
  - **Connectors.** Each `links` entry gets a sprite at its midpoint, rotated to `atan2` of the link, with a thin sepia line under it. `layout()` returns `links` as `{a, b, oneWay}`.
    - The scenario schema gains an optional `oneWay: [from, to][]`. Those pairs use the one-way plaque, flipped so it points from `from` to `to`, and the engine treats them as directed in `canMoveTo`.
    - This is the only engine touch. NotZ declares none, so its behaviour is unchanged.
- `table-bg.png` replaces the parchment JPEG as the board texture, converted to JPEG at about q82.

### 7. Reused translations
- `scripts/import-i18n.ts --locale ru` reads the ArkhamCards `generated/*_ru.txt` and `i18n/ru.po.json`. It writes `content/i18n/ru/campaigns.generated.json`: campaign and scenario names, encounter sets, log titles, and narrative by ArkhamCards id for NotZ.
- Our scenario JSONs gain an optional `i18nId` (the ArkhamCards id, e.g. `the_gathering`) so the names line up.
- UI labels: our `ui.json` keys are matched against `ru.po` by msgid, preferring `msgctxt "action"` for action names. Matches go to `ui.generated.json`.
- Cards: `scripts/import-cards.ts --locale ru` fetches `https://ru.arkhamdb.com/api/public/cards/?encounter=1` (which has ArkhamDB's own translations) and writes `content/i18n/ru/cards.generated.json` (name, subname, traits, text, back text).
- The loader merges `*.generated.json` first, then the hand-written `cards.json`/`ui.json`/`campaigns.json` over it. That is how manual fixes survive a re-run: the script never touches hand-written files. This follows the existing `cards.generated.json` + `cards.json` pattern.
- The runtime reads only `content/`.

*Alternative:* read `arkham4.db` for cards. Rejected: it has English only.

## Risks / Trade-offs

- [A 2× map may not fit large scenarios such as The Midnight Masks with 8+ locations] → The location scale can drop to 1.6× (Decision 1). Hover zoom and the modal still give readable text.
- [Removing the sidebar could hide an option the helper misclassifies] → The `optionHome` playthrough test fails on any unreachable option. As a safety net, any option the helper can't place goes on the rail.
- [Icon font glyphs are on ASCII code points, so missing fonts show letters] → `font-display: block` plus a fallback check.
- [Imported text quality depends on the sources] → Manual override files take precedence.
- [Fonts and strings are third-party] → Personal-use note in the README, as for the card scans.
- [ArkhamDB's API may be unavailable at import time] → The import is offline-tolerant: on a network error it keeps the existing generated file and exits non-zero.

## Migration Plan

- UI and content only. Saves are unchanged.
- Archive `add-core-game-engine`, then `flat-hearthstone-table`, then this change, because its MODIFIED requirements target theirs.
- Rollback means reverting the commit; no data migration is needed.
