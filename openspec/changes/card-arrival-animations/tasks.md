## 1. Arrival tracking

- [x] 1.1 `src/ui/arrivals.ts`: a pure `diffArrivals(prev, next)` returning `{ id, from, to, owner, opening }` for every card that changed zone or newly entered a hand (in hand order), plus a store subscriber that records them with a timestamp and batch index, clears on a new game, and `takeArrival(id)` that returns an arrival once while it is under 1.5 s old (nothing under reduced motion). Unit tests: draw (deck → hand), play (hand → play), spawn (encounter deck → enemy), opening hand flagged, a new game records nothing, an arrival is taken only once and expires.
- [x] 1.2 `originRect(arrival, lookup)` (pure, tested with a fake lookup): deck pile, encounter pile, `RESOLVE_BOX` for encounter or resolving cards, last fan rect, last strip rect, act/agenda panel for locations, pile column for other investigators, screen centre otherwise. Add `data-pile` attributes to the piles and record fan and strip rects (`lastRects`). Verify with the unit tests and `npm test`.

## 2. Hand

- [x] 2.1 Draw sequence in `HandFan`: for a viewer's own draw arrival, a WAAPI keyframe flight on the fan card (deck → show spot face up, enlarged → hold → slot) with a flip on an inner wrapper, 150 ms stagger within a batch, straight deck → slot for the opening hand and mulligan; the card ignores the pointer until it lands; neighbours slide via a `left` transition. Verify in the browser at 1600×900 with screenshots of a draw at the show spot and mid-flight, the opening hand mid-flight, and that clicking works after landing.
- [x] 2.2 Other hand arrivals (from play, discard, encounter) fly face up from their origin straight to the slot. Verify by moving a card from play to hand through the dev store and screenshotting mid-flight.

## 3. Table

- [x] 3.1 `PlayStrip`: new strip cards fly in from their origin (fan rect when played from hand, encounter/middle for threat-area treacheries); events played from hand fly to the resolve spot. Verify with screenshots of Machete mid-flight from the fan to the strip and a treachery entering the threat area.
- [x] 3.2 Map: `Table` sets `place.from` for arriving map cards to their origin unprojected onto the table, and keeps an enemy from a still-queued encounter event hidden until that event has played. Verify with screenshots of a spawning enemy mid-glide from the middle and the act placing locations, each gliding from the act/agenda panel.
- [x] 3.3 Other investigators: a face-down ghost card flies from the pile column to their token on draw; the face is never rendered. Verify with a 2-player game screenshot during Daisy's draw while Roland is viewing.

## 4. Verification

- [x] 4.1 Loading a saved game and the hand-off reveal show no arrival animations; reduced motion (Playwright `emulateMedia({ reducedMotion: "reduce" })`) shows cards in place. Run `.playwright-mcp/drive.js` (two rounds at 1600×900) with no console errors and add screenshots of a draw at the show spot and a card flying to the strip.
- [x] 4.2 `npm test`, `npm run lint`, `npm run build` and `npm run check:content` all pass; README play notes mention the card animations.
