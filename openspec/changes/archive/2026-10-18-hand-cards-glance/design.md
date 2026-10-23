## Context

- `src/ui/hud/fan.ts` holds the fan geometry: `FAN_CARD_W = 300`, `FAN_CARD_H = 420`, `FAN_REST_VISIBLE = 189`, `FAN_LEGAL_RAISE`, `HAND_HOVER_ZOOM = 1.28`, `HOVER_LIFT`, `dockRadius`, `fanLayout`; `HandFan.tsx` reads them for slots, the Dock magnification and the flights; `safeArea.ts` has `HUD_INSETS.bottom = 380`, which the camera uses to keep the map above the fan.
- Card data (`CardDef`): `type`, `icons` (skill icons for commit), `cost`, `abilities` with `effects` (ops: `fight`, `investigate`, `evade`, `damage`, `heal`, `clues`, `draw`, `resources`, `skillTest` with `onSuccess`…), plus `attackDamage`/`damageBonus` modifiers. `src/engine/effects.ts` interprets them; `HandDetails.tsx` already lists icons, cost, slots and uses from the same data.
- The stat dock's token row (`Stats.tsx`): `TokenStack` for resources and clues, `invNumbers` for the values, `FlashStat` for change highlights; `stat.*` strings in `ui.json`.
- In-force ADRs: 0001, 0002, 0003; none constrains this (0003 only changes how an icon is drawn).

## Goals / Non-Goals

**Goals:**

- Smaller fan with the same behaviour; one place (`fan.ts`) changes, everything derived follows.
- A glance summary that is data-derived and tested, with a small override table for the odd cards.
- The hand count where the other totals are.

**Non-Goals:**

- Badges outside the hand; a new hover size; the phone fan.

## Diagram (C4-inspired, component level, ASCII; the browser app is the only container)

Assumptions: lightweight rigor.

```
+----------------------------------------------------------------------------------+
| Browser app                                                                      |
|                                                                                  |
|  content db (CardDef: icons, abilities, effects)        game store (hand, invs)  |
|            |                                                    |                 |
|            v                                                    v                 |
|  +--------------------+  chips[]   +------------------+   +------------------+   |
|  | glance.ts (pure)   |----------->| HandFan          |   | Stats: token row |   |
|  |  chipsFor(card)    |            |  fan.ts sizes    |   |  TokenStack x2   |   |
|  |  override table    |            |  GlanceBadge per |   |  HandCount (new) |   |
|  +--------------------+            |   card, top edge |   +------------------+   |
|                                    +--------+---------+                          |
|                                             | FAN_CARD_H -> HUD_INSETS.bottom    |
|                                             v                                    |
|                                    camera framing (safeArea.ts)                  |
+----------------------------------------------------------------------------------+
```

## Decisions

### 1. Sizes change in `fan.ts` only

`FAN_CARD_W = 225`, `FAN_CARD_H = 315`, `FAN_REST_VISIBLE` scaled (≈ 142), `FAN_LEGAL_RAISE` and `HOVER_LIFT` derived as they are; `HAND_HOVER_ZOOM` stays 1.28 (the user chose the smaller hover). `HUD_INSETS.bottom` drops from 380 to about 300 so the map gains the room. `fanLayout` and `dockRadius` are already in card widths. Alternative: a scale factor applied in CSS; rejected, the flights and the Dock compute in pixels from these constants.

### 2. `chipsFor(card): Chip[]` in `src/ui/glance.ts`

A pure walk over the card's abilities and effects collecting `{icon, n?}` in the agreed priority: action-like ops first (`fight` → combat, `investigate` → intellect, `evade` → agility; `damage`/`attackDamage`/`damageBonus` → damage with the amount; `heal` → health or sanity with the amount; `clues`, `draw`, `resources` with amounts), de-duplicated, then the card's `icons` merged by skill (wild separate). Cut to three. `GLANCE_OVERRIDES: Record<code, Chip[]>` wins when present. Tested against a dozen core cards. Alternative: a hand-written table for all cards; rejected (183 cards, every pack again).

### 3. The badge is part of the card element

`GlanceBadge` renders inside `.fan-card`, absolutely placed along the top edge, scaled with the card (it sits inside the transformed element), `pointer-events: none` except each chip's `title`. It does not move with the Dock separately. Chips use `Icon` at 18 px with the number beside; three chips fit in 225 px.

### 4. Hand count as a token-row item

`HandCount` next to the clue stack: `Icon name="cardBack"` (a new `IconName` backed by the player card back PNG, or the sprite's `cards` symbol once svg-icons lands) with `invNumbers.hand` (the hand length), `title` from `stat.hand` and `stat.handLimit` (limit 8 from the engine's constant), class `over` when `> 8`; `FlashStat` on change like the others.

### 5. Scripts

`drive-calm.js` hovers the fan at y = 880 and clicks at 700; with the fan 105 px shorter the click row moves to about 780. The script reads the card's bounding box already; the fixed y values become derived from it.

## Risks / Trade-offs

- [A chip the data reads wrongly (an ability that _costs_ a resource read as "gain")] -> the walk only reads effect ops that give, never costs; the override table fixes any card found wrong; the test lists the first twenty core cards by hand.
- [Three chips are too many on a 225 px card] -> chips are 18 px icons with 14 px numbers, 60 px each; measured in the browser at 1600×900 before accepting.
- [Smaller cards hurt touch on a phone] -> the phone fan is the phone-landscape change's job; nothing here prevents a larger phone size.

## Migration Plan

UI only. Rollback: git.

## Open Questions

- Whether weaknesses (treacheries in hand) get a chip (a red [weakness] icon) or no badge. Default: the weakness icon alone, so the card is recognised as one.
