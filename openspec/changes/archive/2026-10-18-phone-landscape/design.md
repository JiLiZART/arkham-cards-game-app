## Context

- Fixed-position HUD panels on every edge (`styles.css`), `HUD_INSETS = {top 60, right 320, bottom 380, left 200}` in `safeArea.ts` for the camera, the fan's geometry in `fan.ts`, the rail bottom-right, the feed top-right, the piles left; one media query at 700 px (ribbon initials). Hover drives `HoverCard`, `HandDetails`, the Dock magnification and the intent words; pointer events already drive drags.
- A phone in landscape: 852×393 (iPhone 15), 915×412 (Pixel 8), with ~59 px safe-area insets left and right for the notch. `index.html` has a plain viewport meta.
- After `player-bar` the top strip is one bar; after `skill-test-screen` and `card-draw-showcase` the overlays are the screens listed in the spec.
- In-force ADRs: 0001–0004. 0004 applies (the bar's view switching works the same on the phone). A durable one is introduced below.

## Goals / Non-Goals

**Goals:**

- One mode switch, read by components; the desktop layout untouched.
- Touch as a first-class input: peek, choose, long press.
- Measured on a phone-sized viewport in CI (`perf-devourer.js` at 852×393).

**Non-Goals:**

- Portrait play; new gestures; a native shell.

## Diagram (C4-inspired, component level, ASCII; the browser app is the only container)

```
+--------------------------------------------------------------------------------------+
| Browser app                                                                          |
|  layoutMode.ts: useLayoutMode() -> "desktop" | "phone"   (viewport + orientation)    |
|       |  insets(mode) -> HUD_INSETS                                                  |
|       v                                                                              |
|  .game.phone (root class)                                                            |
|  +----------------------------------------------------------------------------+      |
|  | PlayerBar (36px) · phases as initials · [journal] [bag]                     |      |
|  |                                                                            |      |
|  | [left handle] MAP (full bleed, camera insets by mode)      [strip column]  |      |
|  |  Drawer(left): act, agenda, piles      Drawer(right): Journal             |      |
|  |                                                                            |      |
|  | InstructionBar (+ Draw/Resource/Investigate)   above the hand drawer        |      |
|  | HandDrawer: peek 60px <-> open fan (HandFan in drawer mode)                 |      |
|  +----------------------------------------------------------------------------+      |
|  touch.ts: tap = peek (details/copy), 2nd tap = choose, long press = modal           |
|  Overlays (SkillTestScreen, Showcase, HandOff, titles, TipLayer) read the mode        |
+--------------------------------------------------------------------------------------+
```

## Decisions

### 1. One layout mode, one root class (ADR-0005)

`useLayoutMode()` returns the mode from a `matchMedia` pair plus orientation; `App` sets `.game.phone`; CSS rules live under that class; components that need geometry (camera insets, fan sizes, overlay layouts) read the mode. Alternative: media queries per component; rejected, the camera and the fan compute in pixels and would drift from the CSS.

### 2. Drawers are one component

`Drawer` (edge, open state, handle, swipe to open, tap outside to close, safe-area padding) hosts the left panels, the Journal and the hand. The hand drawer wraps `HandFan` in a "drawer mode" that renders the peek row when collapsed and the fan (sized to the drawer) when open.

### 3. Touch model in `touch.ts`

A pointer of type `touch` on a card/marker/token goes through `peek(id)` (sets hover state so the existing details and copies render) and, if the same id is tapped again within 1.5 s, `choose`. Long press (450 ms, no move) opens the modal. Pointer type `mouse` keeps hover and single-click choose. The existing `useCardClick().byCard` supplies the options; no component gets a second code path, only the gate in front of `choose`.

### 4. Instruction bar absorbs the rail

In phone mode `onRail` options render inside the instruction bar after its own buttons; the rail component is not mounted.

### 5. Insets and DPR

`HUD_INSETS` becomes `insets(mode)`: phone `{top 36, right 56, bottom 70, left 0}` plus safe-area values read from CSS env through a resize observer; `MapCamera` caps `dpr` at 2 in phone mode.

### 6. Orientation card

A `RotateCard` overlay when `mode === "phone"` and the viewport is portrait; state untouched.

## Risks / Trade-offs

- [Two tap model confuses first-time players] -> the instruction bar's wording on phones says "tap to look, tap again to choose" for the first turn (a tip), and option taps on a peeked card are immediate.
- [Overlays designed on desktop break at 393 px tall] -> each overlay gets a phone rule set in this change and a screenshot in `check-phone.js`; the showcase shrink rule and the skill-test zones were designed to allow it.
- [Hover-only information (intent words on hover)] -> peek shows it; the badges already show the glyph.
- [Performance on real phones] -> DPR cap, the perf script at phone size with 4× throttle; a real-device check before archive.

## Migration Plan

Additive; the desktop layout is unchanged. Rollback: git.

## Open Questions

- Whether the left drawer should stay open while the act or agenda has a pending option (Advance act). Default: the instruction bar offers the option, so the drawer may stay closed.
