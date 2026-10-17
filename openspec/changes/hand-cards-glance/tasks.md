## 1. Smaller fan

- [x] 1.1 Set `FAN_CARD_W = 225`, `FAN_CARD_H = 315` and the derived constants in `src/ui/hud/fan.ts`; lower `HUD_INSETS.bottom` in `safeArea.ts` to match; update `fan.test.ts` expectations (slots, dock radius, hover scale at 800 px tall). Verify in the browser at 1600×900: a 7-card hand rests at 225×315, the hovered card is about 288×403 and fully on screen, 12 cards stay reachable, the map's focus framing sits above the fan.

## 2. Glance badge

- [ ] 2.1 Add `src/ui/glance.ts` with `chipsFor(card)` (effects first, then committed icons, cut to three) and `GLANCE_OVERRIDES`, with `glance.test.ts` covering: Machete ([combat], [damage] +1, [combat] 1), Vicious Blow ([damage] +1, [combat] 1), Flashlight ([intellect] …), Emergency Cache ([resource] 3), Dynamite Blast ([damage] 3), a skill card with only icons, a card with nothing (no badge), an override winning over the derivation, a weakness (the weakness icon alone), and the three-chip cut.
- [ ] 2.2 Render `GlanceBadge` along the top edge of every `.fan-card` (icons at 18 px with numbers, tooltips naming each chip, `pointer-events: none`), scaled with the card. Verify in the browser: Roland's hand shows the chips on each card at rest and hovered, three fit without overlapping the card's title, and a card with no chips shows nothing.

## 3. Hand count

- [ ] 3.1 Add `HandCount` to the token row after the clue stack: card-back icon, the hand's size, tooltip from `stat.hand` / `stat.handLimit` (en and ru), red over 8, `FlashStat` on change; add `hand` to `invNumbers`. Verify in the browser: 7 cards show "7" with the tooltip; drawing to 9 shows red; Russian tooltip renders.

## 4. Verification and docs

- [ ] 4.1 Update `drive-calm.js` (derive the fan hover and click rows from the card's box instead of 880/700); run `npm test`, `npm run lint`, `npm run build`, `npm run check:content`, all clean; `drive-calm.js` to round 3 with 0 errors; `check-tips.js` passes (the hand tip anchors to the fan).
- [ ] 4.2 README play notes: the smaller fan, the glance badge and what its chips mean, the hand count and limit colour. Run `openspec validate hand-cards-glance --type change --strict`.
