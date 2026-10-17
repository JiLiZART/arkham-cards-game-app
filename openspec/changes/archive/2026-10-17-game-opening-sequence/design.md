## Context

- **Mulligan** (`mulliganHandler`, `src/engine/rules/investigators.ts`): the step keeps `chosen: InstId[]`. Picked cards stay in the hand zone. The options are `done` (labelled "Keep hand" / "Redraw N card(s)") plus one per un-picked hand card, whose option id is the card id. While the scenario is set up, `phase === "setup"`.
- **New scenarios:** `createGame` builds the final setup state at once: act, agenda, starting locations (revealed if an investigator starts there), opening hands. Then the Mulligan steps run. `trackArrivals` records nothing for a new game's first state, except the opening hand (`opening`).
- **Map cards:** `CardMesh` damps from `place.from` to `place.pos` and damps `flip.rotation.y` toward the shown side, so a reveal is a quick, flat turn. `Table` sets `place.from` for arrivals (`originRect`, "actAgenda" for locations) and can `hold` a card hidden.
- **Panel and modal:** `ScenarioPanel` shows agenda and act; a click opens `CardModal`, which shows both sides of an act or agenda plus its options. The reference card is shown only in `ChaosBagModal`.
- **HTML flights:** `flights.ts` (`flyIn`, `centreTransform`), `whenSettled` / `cardsFlying` (`arrivals.ts`), `rememberRect` / `lastRects`.

## Goals / Non-Goals

**Goals:**
- The opening plays as a UI sequence over the already-final state, like the other animations. The engine only gains the mulligan un-pick.
- Reuse the existing flight helpers and `CardMesh` placement; no new animation library.

**Non-Goals:**
- An intro for campaign interludes or resolutions.
- Animating the encounter deck build.
- Changes to the act/agenda rules.

## Decisions

### 1. Mulligan un-pick in the engine
`mulliganHandler` adds `{ id: "un:" + h, label: "Take back <name>", card: h, value: { unpick: h } }` for each picked card. On pick, it removes `h` from `chosen` and re-pushes the step. Picked cards stay in `hand`, so the UI decides where to draw them from `pending.step.chosen`, which is already serialized with the pending step.

`optionHome` sends `un:` mulligan options to a new `"mulligan"` home: the row renders them, and the rail and fan don't. The bot picks only `done`.

*Alternative:* move picked cards to a `limbo`/aside zone. Rejected: it changes the zone semantics for hand-reading effects and the weakness-aside logic.

### 2. The "to redraw" row
`MulliganRow` (HUD) shows, during a `mulligan` pending of the viewer, the cards in `step.chosen` as `MiniCard`s 124×173 on a labelled tray above the fan. `HandFan` leaves those cards out of its layout.

Flights:
- **pick:** the card's last fan rect → its row slot, using `useFlyIn`-style FLIP with `lastRects`;
- **un-pick:** row rect → fan slot. `HandFan` treats a card that reappears with a remembered row rect as an arrival from there, using a small "local arrival" map in `arrivals.ts` (`noteLocalMove(id, rect)`), since the zone doesn't change.

On confirm, the existing arrival tracking sees hand → deck for the picked cards. A new `flyGhost`-style back flight goes from the row rect to the deck pile (`domPlace("deck")`), and the replacements arrive as an opening draw.

### 3. Intro director
A small store slice in `view.ts`, `intro: { step: "agenda" | "act" | "deal" | null, setup }`.
- A subscriber in `arrivals.ts`, next to `trackArrivals`, starts the intro when a live game goes from `phase === "setup"` to a later phase with the same `setup`, so it never starts for a loaded or imported game: `quietNextGame` covers those.
- `IntroOverlay` renders the current card large with `CardFace`. For the agenda step it also shows `scenarioText(...).name` and `.intro`, and a Continue button (Space/Enter too).
- Continue flies the card with `flyIn`-like keyframes from the centre box to the panel slot (`.scenario-panel [data-card=…]`) and then advances the step.
- While `intro.step` is set, the store's `choose` is blocked, just as it is while events animate (`busy`). `HandOff` waits for it too.

During setup and the intro, until the `deal` step starts, `ScenarioPanel` hides the act and agenda and `Table` keeps every location hidden (`hold`). In two-player games with privacy, the intro shows before the first hand-off screen.

### 4. Dealing locations and the 3D flip
`Table` gets a `deal` list. When `intro.step` becomes `deal`, every location on the map is given an arrival from "actAgenda" with `batch` index ordering: the starting location first, then the rest in layout order. The 250 ms stagger works through each `CardMesh`'s `hold` until `now ≥ start + batch × 250`.

`CardMesh` gets a `faceDownUntilLanded` flag. It shows the back while gliding and starts the flip when `mapMoving` no longer contains it. The intro ends (`intro.step = null`) when the last dealt card has flipped, via `whenSettled`.

Investigator portraits on a location are hidden while that location is held or face down during the deal.

Flip animation: instead of damping `rotation.y`, a flip is a timed tween of 600 ms. Over that time the card rises to `y + 0.6` and `rotation.y` eases from π to 0 with ease-in-out; then it settles. It triggers whenever `showFront` changes after the card has landed. Reduced motion jumps straight to the new side.

Later placements already come from "actAgenda" through `originRect`; they get the same `faceDownUntilLanded`, so a location placed revealed flips after landing.

For a reveal on entering, the move's portrait glide finishes first: the flip waits while `mapMoving` has the investigator's mini, which is added there too.

### 5. Act and agenda viewer
`ScenarioPanel` adds the reference card (`db.scenarios[id].card`; front for easy/standard, back for hard/expert) as a third mini card. A click opens `DeckViewer` (`Modals.tsx`) with kind `act`, `agenda` or `reference`:
- **acts/agendas:** `scenario.acts` / `.agendas` codes in order.
  - A card counts as reached if its index is ≤ the current one's index.
  - Reached cards show front and back.
  - Upcoming cards show the front and a "not yet revealed" back placeholder.
  - The current card's pending options use the existing `OptionButtons`.
- **reference:** both sides, plus `groupTokens(chaosBag)`, reusing the chaos bag modal's grid.

`setModal` gets `{ deck: "act" | "agenda" | "reference" }`. The old `{ card }` path stays for other cards.

## Risks / Trade-offs

- [Hiding the table during the mulligan changes what players see while deciding] → Hearthstone-like and spec'd. The hand, piles and investigator panel stay visible.
- [Intro blocking input in hot-seat play] → Short, and click-through. A Skip link on the overlay ends it at once: cards jump to place, locations appear revealed.
- [The flip tween and the existing damping fight over `rotation.y`] → While a flip runs, the tween owns `rotation.y`. Damping resumes only after it ends.
- [The local-move map for un-picks drifts] → Entries expire like arrivals (1.5 s, taken once).
- [The bot or autoplay never sees the intro] → The intro is UI-only. `autoStep` and tests drive the engine directly.

## Open Questions

<!-- none -->
