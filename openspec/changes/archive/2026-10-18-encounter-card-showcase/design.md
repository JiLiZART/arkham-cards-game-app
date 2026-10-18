## Context

Today an encounter draw is the `encounter` event: `EventPlayer` (Hud.tsx) claims the middle of the screen for it, `RevealOverlay` renders `EncounterFlight` (the card flies from the encounter pile to `RESOLVE_BOX`, 260×364 px under the banner, and flips), a timer of 1400 ms (× 1.6 at Slow) calls `nextEvent`, and only at the Tap pace does it wait for the caption's Next. The map keeps a spawned enemy hidden until that event has played (`Table.tsx` `held`), and arrivals from a shown card start at `RESOLVE_BOX` (`arrivals.ts` `originRect`, `shown`). A treachery sits in the engine's `resolving` zone while its revelation runs; `Resolving` draws it at `RESOLVE_BOX` whenever nothing else holds the middle. A weakness drawn from a player deck is announced as a plain `draw` event and then its revelation or spawn runs.

Cards drawn into the hand have the showcase (`Showcase.tsx`, `showcase.ts`): a dark overlay, `showcaseLayout` sizes, `riseAndArc` out of the pile, hover details, and the player's tap, Space or Enter to send them on, with `noteLocalMove` so the fan flies them from where they stood.

Constraints: in-force ADRs 0001–0006. ADR-0002 (presentation reacts to the animation clock, not the log) is the one this touches: the held event is still the event player's `current`, and the engine is untouched except for naming a weakness draw. ADR-0004 is unaffected: the overlay is public, independent of who is viewing.

## Goals / Non-Goals

**Goals:**
- Every drawn encounter card and weakness is readable and waits for the player before anything it does happens, at every pace.
- After the tap the card visibly goes where the rules send it; nothing appears in place.
- Nothing else about the event order, the engine or the pace model changes.

**Non-Goals:**
- Showcasing events played from hand or cards revealed by other effects (locations, act or agenda advances).
- Changing the Tap pace for other events, or the drawn-hand-card showcase.
- A new engine step or save format change.

## Diagram (C4-inspired, component level, ASCII; the browser app is the only container)

```
 engine (pure)                      store.ts                       hud
 ┌───────────────────┐  events  ┌───────────────────┐  current   ┌──────────────────────────────┐
 │ DrawEncounter     │─────────▶│ queue / current   │───────────▶│ EventPlayer (Hud.tsx)        │
 │  emit "encounter" │          │ nextEvent()       │◀───────┐   │  HELD = {encounter,weakness} │
 │ Draw (weakness)   │          │ needsNext: not    │  tap   │   │  no timer for HELD; claims   │
 │  emit "weakness"  │          │  for HELD types   │        │   │  the stage (CENTER)          │
 └───────────────────┘          └───────────────────┘        │   └──────────────┬───────────────┘
                                                             │                  │ playing
                                 view.ts stage ◀─────────────┼──────────────────┤
                                                             │                  ▼
 ┌───────────────────┐  noteLocalMove(card, el)   ┌──────────┴───────────────────────────────┐
 │ arrivals.ts       │◀───────────────────────────│ RevealOverlay → EncounterShowcase        │
 │ originRect: a     │                            │  .showcase backdrop, 1 card at           │
 │ shown card leaves │                            │  showcaseLayout(1) width, riseAndArc     │
 │ from its noted    │                            │  from its pile, DetailsColumn on hover,  │
 │ rect, else resolve│                            │  help line + Continue; tap/Space/Enter   │
 └───────┬───────────┘                            │  → noteLocalMove + nextEvent()           │
         │ glide from there                       └──────────────────────────────────────────┘
         ▼
 Table.tsx (spawn/attach)   PlayStrip (threat)   Resolving @ RESOLVE_BOX   SkillTestScreen subject
```

- The hold lives where holds already live: `EventPlayer` decides `waits`, the overlay provides the control. No new state in the view store beyond what `playing` and the stage give.
- The engine change is one event name; the log order (draw → revelation/spawn) is unchanged, so replay and saves are unaffected.
- Arrivals keep their contract: "from where it was shown" now means the showcased card's rect.

## Decisions

### 1. The encounter reveal becomes a showcase overlay, driven by the same event
Replace `EncounterFlight` with `EncounterShowcase` in `Reveal.tsx`: the `.showcase` backdrop and layout (`showcaseLayout(1, w, h)`), the card rising with `riseAndArc` from its pile (`domPlace("encounter")` for an encounter card, the viewer's deck pile for a weakness, `RESOLVE_BOX` as fallback), face up after the arc, `DetailsColumn` on hover/focus/long press like the hand showcase, a help line (`encounter.take`: "Tap the card to continue") and a Continue button. Tap, Continue, Space and Enter call `noteLocalMove(card, el)` then `nextEvent()`. Alternative rejected: pushing the card into `view.showcase` and reusing `Showcase.tsx` outright; that component is about the viewer's hand (privacy, deck picks, "To hand"), and an encounter card is public with different destinations.

### 2. Held at every pace through the event player
In `Hud.tsx`, `HELD = new Set(["encounter", "weakness"])`; `waits` is true for them regardless of pace, so no timer fires. `CENTER` gains `weakness` so it claims the stage like `encounter`. In `store.ts`, `holdsForTap` is unchanged and `needsNext` excludes HELD types (the overlay has its own Continue, as the result panel does), so the caption shows no second Next; `ANIMATED` gains `weakness`. Alternative rejected: a timed reveal at Normal, held only at Tap; the user chose to always wait.

### 3. A drawn weakness is its own event
`investigators.ts` emits `weakness` instead of `draw` when the drawn card has a subtype and is a treachery or enemy ("{inv} draws weakness {card}"), with `feed.weakness` in en and ru. The UI keys the showcase on event type, not on card data at render time. `spotlight.ts` SPOT gains `weakness`. Alternative rejected: detecting a weakness from a `draw` event by looking up the card; it couples the event player to card data and would also fire for face-down draws of other investigators.

### 4. Arrivals leave from the showcased card
`originRect` in `arrivals.ts`: when a local move is noted for the card (`takeLocalMove(id)`), use it before the `shown`/`resolving` fallback to `RESOLVE_BOX`. `diffArrivals` marks cards from `weakness` events as `shown` too. `Table.tsx` `held` treats `weakness` like `encounter` so a weakness enemy stays hidden until tapped. `Resolving` and `useFlyIn` already fly from a noted move (the fan uses it), so a treachery with a choice slides from the showcase down to `RESOLVE_BOX`.

### 5. Scripts tap the showcase
`drive-calm.js` `settle()` taps `.encounter-showcase .sc-card` when present (as it does for the hand showcase); `check-encounter-showcase.js` injects a Ghoul Minion draw, a Rotting Remains draw, an Offer of Power draw and a Cover Up draw and asserts the hold, the tap, the destination and that no follow-on event (damage, test, spawn) happened before the tap.

## Risks / Trade-offs

- [Every mythos draw now needs a tap: slower rounds] → it is what the user asked for; the tap is one click or Space, and the card was already a 1.4 s hold.
- [The showcase and the phase title both want the middle] → the stage already serialises them (`CENTER`, `useStage`); the title waits for the event, as the spec's "Encounter during a phase title" requires.
- [A weakness drawn behind the hand-off screen] → the overlay is public and shows over the hand-off box; the drawn card's face is a weakness, which the rules make public anyway.
- [Renaming the event breaks a feed or Journal test] → update `feed.test.ts` expectations; the engine tests that assert on `draw` for weaknesses (one in `engine.test.ts`) are adjusted.
- [The chaos draw waits for settle; the test subject must not start before the card has flown off] → `waitsForSettle` already covers the token; the skill-test screen claims the stage after the encounter event releases it.

## Migration Plan

Code only; the log gains an event type for new games (old logs replay fine, the UI simply shows no showcase for a `draw` of a weakness in them). Rollback is a revert.

## Open Questions

- None.
