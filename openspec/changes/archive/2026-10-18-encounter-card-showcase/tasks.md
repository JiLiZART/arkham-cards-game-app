## 1. Engine: the weakness event

- [x] 1.1 Engine test first: drawing Cover Up logs a `weakness` event with the card, then its revelation; an ordinary draw still logs `draw`. Fails on current code. Then `src/engine/rules/investigators.ts` emits `weakness` for a drawn weakness; `feed.weakness` in en and ru; adjust the feed and engine tests that assert on `draw` for a weakness. Full suite green.

## 2. Holding the event

- [x] 2.1 `src/ui/store.ts`: `HELD` set (`encounter`, `weakness`), `ANIMATED` gains `weakness`, `needsNext` false for HELD types; a unit test for `needsNext`/`holdsForTap` at each pace. `src/ui/spotlight.ts` SPOT gains `weakness` (test).
- [x] 2.2 `src/ui/hud/Hud.tsx` EventPlayer: HELD events never time out (`waits`), `CENTER` gains `weakness`. `src/ui/scene/Table.tsx` `held` covers `weakness`. `src/ui/arrivals.ts`: `diffArrivals` marks `weakness` cards as shown (test), `originRect` prefers a noted local move for a shown card (test).

## 3. The overlay

- [x] 3.1 `src/ui/hud/Reveal.tsx`: `EncounterShowcase` replaces `EncounterFlight`: `.showcase` backdrop and `showcaseLayout(1)` size, `riseAndArc` from the encounter pile or the drawer's deck pile (fallback `RESOLVE_BOX`), face up after the arc, `DetailsColumn` on hover/focus/long press, help line `encounter.take` and a Continue button; tap, Continue, Space and Enter call `noteLocalMove` then `nextEvent`. Reduced motion: the card appears and waits. Strings in en and ru. Styles in `styles.css`.
- [x] 3.2 Browser: new `.playwright-mcp/check-encounter-showcase.js` (two investigators, Normal pace): inject a Ghoul Minion draw → the card waits, the Ghoul is not on the map, no timer closes it in 3 s; tap → it glides to its location. Rotting Remains → waits; Space → the skill-test screen opens with it as subject. Offer of Power → tap → the card sits at the resolving spot with the choice offered. Cover Up from Roland's deck → waits, tap → threat area. At the Tap pace the caption shows no Next while the showcase holds. Screenshots.
- [x] 3.3 `drive-calm.js`: `settle()` taps the encounter showcase; run to round 3 with 0 errors. `check-treachery-test.js` and `check-players.js` updated for the hold where they inject a revelation (tap first), and pass.

## 4. Verification and docs

- [x] 4.1 `npm test`, `npm run lint`, `npm run build`, `npm run check:content` clean.
- [x] 4.2 README play notes: drawn encounter cards and weaknesses stop in the showcase until tapped at every pace; the pace note updated. Run `openspec validate encounter-card-showcase --type change --strict`.
