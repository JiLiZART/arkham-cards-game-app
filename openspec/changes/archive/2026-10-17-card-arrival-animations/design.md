## Context

- The engine moves cards between zones (`deck`, `hand`, `play`, `threat`, `enemy`, `location`, `resolving`, discard, encounter deck…) and logs events; the UI's `EventPlayer` plays a queue of animated events (`ANIMATED` in `store.ts`) while the game state is already final.
- The only card flight today is `EncounterFlight` (`Reveal.tsx`): a fixed HTML card moving with CSS transitions from the encounter pile to `RESOLVE_BOX` and flipping (`.flight`, `.flip`).
- `HandFan` positions cards with a requestAnimationFrame loop (Dock magnification); `PlayStrip` renders `MiniCard`s; map cards are `CardMesh`es that damp from `place.from` to `place.pos` (`from` is currently the card's own position, so nothing flies).
- Other investigators' hands are never shown; their decks have no pile on screen.

## Goals / Non-Goals

**Goals:**
- One place that knows "card X just arrived in zone Z from zone Y", derived from state changes, so every arrival can be animated without engine changes.
- A Hearthstone-like draw for the viewer's own draws; plain fly-ins for everything else.

**Non-Goals:**
- No animations for cards *leaving* (discarding, defeat), beyond the existing ones.
- No change to the event queue timing; arrival animations run alongside it.
- No new 3D card flights for HTML areas (hand, strip stay HTML).

## Decisions

### 1. Arrivals derived in the UI (`src/ui/arrivals.ts`)
A store subscriber compares each new `game` with the previous one: for every card whose zone changed (or that is new in a hand), it records `{ id, from: Zone, to: Zone, owner, at: performance.now(), opening }`, where `opening` is true during setup/mulligan (round 0). A new game (new `setup` object, e.g. load or new scenario) clears the record and records nothing for that first state, so loaded games don't animate. Components ask `takeArrival(id, maxAgeMs = 1500)` once, when they first render a card; old or already-taken arrivals return nothing (so cards revealed behind the hand-off screen don't fly).

*Alternative:* add `from`/`to` to engine events. Rejected: many moves have no event, and it couples the engine to presentation.

### 2. Origins and targets from the DOM and the map projector
`originRect(arrival)` (pure, unit-tested with a fake rect lookup) maps the from-zone to a screen rect:
- `deck` → the viewer's deck pile (`[data-pile="deck"]`); for another investigator, the pile column;
- encounter deck → encounter pile; `resolving`, or a card whose `encounter` event was just shown → `RESOLVE_BOX`;
- `hand` → the card's last fan rect (HandFan records each card's rect in the frame loop into `lastRects`);
- `play`/`threat` → its last strip rect (recorded the same way);
- set-aside locations → the act/agenda panel;
- anything else → screen centre, small.

### 3. HTML flights with the Web Animations API
Fan cards, strip cards and ghost cards animate with `element.animate()` keyframes (a FLIP from the origin rect to the element's own rect). WAAPI overrides the frame loop's inline transform while it runs and hands back control when it finishes, so the Dock loop needs no changes. A card is `pointer-events: none` until its animation's `finished` resolves.

The draw sequence for the viewer's own draw is one keyframe list on the fan card plus a flip on an inner wrapper: deck rect (face down, small) → show spot (above the hand, right of centre, scale ≈ hover size, face up at ~40%) → hold → slot (scale 1). Durations: rise+flip 350 ms, hold 450 ms, settle 300 ms. Stagger: arrivals recorded in the same state change get `delay = index × 150 ms`. Opening/mulligan: deck → slot only, 400 ms.

Fan gap: fan cards get a `left` transition (0.3 s) so neighbours slide when the hand grows or shrinks.

*Alternative:* CSS transitions with React state per phase (like `EncounterFlight`). Rejected: three phases per card plus staggering means many re-renders and timers; WAAPI keyframes are one call.

### 4. Map arrivals through `place.from`
`Table` asks `takeArrival` for map cards it hasn't placed yet and sets `place.from` to the origin rect's centre unprojected onto the table plane (the camera is orthographic top-down, so this is exact). If the arrival came from an encounter card whose `encounter` event is still queued or playing, the mesh stays invisible until the queue passes that log index, so the enemy appears to leave the shown card.

### 5. Other investigators
`Investigators.tsx` renders a short-lived face-down ghost card (the player card back) per arrival in another investigator's hand, flying from the pile column to that investigator's token and fading. The face is never rendered.

### 6. Reduced motion
`matchMedia("(prefers-reduced-motion: reduce)")` → `takeArrival` returns nothing, so everything appears in place.

## Risks / Trade-offs

- [State arrives before the event queue animates] → Map arrivals tied to an encounter event wait for that event; hand and strip arrivals start immediately, which matches the existing feed timing closely enough (draws aren't queued events).
- [Fan rect of a card that just left the hand] → Recorded every frame by the Dock loop into `lastRects`; if missing (hand hidden), fall back to the fan's centre.
- [Many simultaneous arrivals (scenario setup)] → Setup state is a new game and records nothing; act-advance location placements are 4–6 cards, staggered.
- [WAAPI and the Dock loop both touching transform] → WAAPI has priority while running; the loop keeps writing inline values underneath, which take over seamlessly at the end because the keyframes end at the card's resting transform (`fill: none`).
