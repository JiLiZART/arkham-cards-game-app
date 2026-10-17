## Context

- `PlayStrip` (`src/ui/hud/Panels.tsx`) renders `MiniCard`s at 96×134. A click goes through `useCardClick`, which chooses a single option or opens the `PopupMenu` at the pointer.
- Hovering a strip card shows `HoverCard`: a 2× copy placed by `placeHover`, with a fixed 170 px details panel *under* the copy. Strip cards sit 228 px from the bottom, so the copy plus panel is squeezed and the panel is clipped.
- Hand cards and locations already use `DetailsColumn` (`HandDetails.tsx`), which `cardDetails` (`src/ui/details.ts`) fills and `placeDetails` places beside the card. `cardDetails` has no enemy rows yet.
- `SkillTestPanel` (`Hud.tsx`) shows `value vs diff`, tokens, and 54×76 committed thumbnails, with no hover or click.
- The engine's `commitStage` (`skillTest.ts`) asks `who` with options: `done`, `{ commit }` per hand card, and `{ ability }` per fast ability. `t.committed` and `t.committers` are parallel arrays. Each investigator gets exactly one commit window (`asked`).
- `ActionFloats` (`Floats.tsx`): `LIFE_MS` 1500, `STAGGER_MS` 350, `MAX_VISIBLE` 3. `FeedEntry` carries no event type.
- Phase events (`emit(g, "phase", …, { data: { phase, round } })`) aren't in `ANIMATED`. They show only as a feed line and a float.

## Goals / Non-Goals

**Goals:**
- Reuse `DetailsColumn` / `cardDetails` for every non-hand hover, instead of a second details layout.
- Make card options visible on the card, starting with the strip.
- Make the take-back engine-side, so it is replayable and testable.

**Non-Goals:**
- Option buttons on map enemies. Map cards keep click / menu; the strip is where engaged enemies live.
- Phase titles blocking input or joining the event queue.
- Undo of fast abilities used during the commit window.

## Decisions

### 1. Hover: copy without the under-panel, plus `DetailsColumn`
`HoverCard` drops its `hover-details` block and calls `placeHover(rect, 0, …)`, so the copy alone is clamped fully on screen. It then renders `DetailsColumn` with `cardDetails(db, code, locale, { inst, game })` next to the copy's box. `DetailsColumn` takes a `Rect`, so passing the copy's box puts the column beside the copy, not over it.

`cardDetails` gains enemy rows, used when `d.type === "enemy"`:
- `enemy`: fight, health (× per investigator glyph when printed so), evade;
- `attack`: damage and horror icons;
- `damage`: current damage on the instance, when `at` is given.

The text row stays as-is, and tokens stay on the copy through `TokenBadges`.

*Alternative:* keep the under-panel and grow it. Rejected: it duplicates the hand layout and is exactly what clips at the bottom.

### 2. Option buttons above strip cards
`PlayStrip` reads `byCard` (already there). For a card with options and while not busy, it renders a small `.strip-actions` row absolutely positioned above the slot. Each option is a button with an icon and a short label:
- `{ kind: "fight" }` → combat icon + "Fight";
- `{ kind: "evade" }` → agility icon + "Evade";
- `{ kind: "engage" }` → "Engage";
- anything else → the engine label, with the card name stripped ("Use .45 Automatic" → "Use").

A helper `stripActionLabel(o, db, locale)` lives next to `railItem` in `ActionRail.tsx` and reuses its translation keys pattern (`strip.fight`, `strip.evade`, …).

The card click keeps `useCardClick` behaviour. With buttons visible there is no need for the menu, so a click on a multi-option strip card does nothing; the buttons are the way.

Size: strip slots grow to 124×173 (exhausted width 173). The strip already flexes. If the strip's width (`right − left`) can't fit all slots plus gaps, a CSS variable `--strip-w` is computed in `PlayStrip` from the card count and the strip's own width, clamped to [84, 124], with the height at 1.4×.

Target highlight: if `game.skillTest?.target` is a strip card, its `MiniCard` gets the class `target` (gold outline).

### 3. Uncommit in the engine
`commitStage` adds, for the cards `c` with `t.committers[k] === who`, an option `{ id: "un:" + c, label: "Take back <name>", card: c, value: { uncommit: c } }`. On pick:
- move the card to its owner's hand with `moveCard(g, c, "hand")`;
- splice it from `committed` and `committers`;
- emit `uncommit` (feed line "X takes back Y", translated);
- re-push the step with `choice: undefined`.

The take-back only ever covers the current window, because a window is closed (added to `asked`) once `done` is picked. The bot's preference list doesn't match "Take back", and a guard skips `uncommit` values.

`optionHome`: `commit`-zone cards are in `BOARD_ZONES` today, which sends them to "board", where nothing renders them. A new home `"skilltest"` covers options whose card is in the `commit` zone, and `SkillTestPanel` renders those as clickable cards. The test in `optionHome.test.ts` covers this.

### 4. Skill-test panel
Committed cards render at 86×120 with `hoverProps` and `rememberRect`, so a taken-back card flies from its spot into the fan. `originRect` gets `case "commit": return last(a.id) ?? find("skilltest")`, with `.skilltest` in `SELECTORS`. Cards with an un-commit option get `legal` styling and an "↶" corner badge, and a click chooses the option.

The breakdown line uses a new pure helper `testParts(g, t)` in `skillTest.ts`, returning `{ base, icons: [{card, n}], mods, total, diff }`. It is unit-tested, and `testValue` is rewritten as its sum so the two never disagree.

### 5. Phase title
`PhaseTitle` in `Hud.tsx` watches `game.log` for new `phase` entries, the same way `ActionFloats` tracks `shown`, and queues them. A new game starts from its current log, so loading a save shows nothing. It shows one at a time for 2.6 s in total (0.5 s in, about 1.6 s hold, 0.5 s out) with a CSS keyframe animation:
- `letter-spacing` opening up;
- a slight upward drift;
- a dark horizontal band behind the text.

It plays the next one on `animationend`. Text: `t("phase.title", { phase })` → "Mythos Phase" / "Фаза мифов", plus `t("phase.round", { round })`, in the Teutonic display font already used for names. Its styles are `pointer-events: none` with z-index above the floats.

To keep phases out of floats, `FeedEntry` gains an optional `kind` (the event type), set in `feedEntry`. `ActionFloats` skips `kind === "phase"`.

### 6. Float timing
`Floats.tsx`:
- life `= clamp(3500 + 60 × max(0, chars − 30), 3500, 6000)`, where `chars` is the summed text length of the parts;
- `STAGGER_MS` 900, `MAX_VISIBLE` 2, `BURST` keeps the last 2.

The life is stored per float, and the CSS fade uses a custom property `--life` so the fade starts at `life − 600 ms`.

### 7. Chaos draw: what is tested, and waiting for the screen to settle
The game state is already final when the `token` event plays, so `game.skillTest` may be gone. The engine's `token` event therefore carries the test itself:
- its `card` is `target ?? source`;
- its `data` gains `skill`, `kind`, `value` and `difficulty`, taken from `testParts` at reveal time, so committed cards count.

(Reading the `testStart` event instead was rejected: its value is from before the commit window.)

`TestSubject` renders the card as a `CardFace` left of the bag (`.test-subject`); the circles fan out above the bag, so there is no room there. The hover sets an HTML rect, so the enlarged copy and details column work; `HoverCard` now uses its copy for any HTML-hovered location, keeping the side column for map locations. The line under it is a `Sentence`: the inv part, the skill icon and name, then value `draw.vs` difficulty. The automatic `TokenPop` shows the same block while it runs. The skill-test panel hides tokens whose draw hasn't played yet, so it doesn't spoil the draw.

Settling lives in `EventPlayer`. When `current` is a `token` event, it renders nothing until `settled` is true. A `requestAnimationFrame` loop checks:
- whether `document.getAnimations()` has any running animation whose target is a card flight (`[data-card]`, `.flight`, `.fan-flip`, `.ghost-card`);
- whether the map has an arrival still `hold`ing or gliding (`peekArrival` for map cards, which `Table` already consults).

Once both are clear for 400 ms, `settled` turns true; after 4 s it turns true regardless. The encounter flight is itself a queued event, so it has already finished by the time `current` becomes the token. The settle wait mainly covers the WAAPI arrival flights that run alongside the queue (a drawn card, an enemy gliding in). The same gate applies to the automatic reveal and to the phase title.

*Alternative:* add every arrival flight to the event queue. Rejected: arrivals are deliberately outside the queue so input isn't blocked by every draw.

## Risks / Trade-offs

- [Buttons above strip cards collide with the hand fan's hover enlargement] → The strip sits above the fan and the raised hand card already has a higher z-index; the buttons share the strip's z-index, so a raised hand card covers them, as it does the strip.
- [Wide strips (many assets) with buttons] → Each button row is at most the card's width plus 24 px; the labels are short and wrap to icon-only under 100 px.
- [Uncommit changes old logs?] → No: a new option id only appears in new choices; old logs never selected it, and option ids for `done` and commit stay the same.
- [Longer floats pile up in busy turns] → Queue length is visible in the feed anyway; the burst rule drops old ones on scenario start, and the queue never blocks input.
- [Phase title over the chaos-token draw or encounter reveal] → The title is shown only while `current` is not a `token`, `testResult` or `encounter` event; otherwise it waits in its queue.

## Open Questions

- Whether map enemies should get the same on-card buttons. This can be added later with the same `stripActionLabel` helper and doesn't change this design.
