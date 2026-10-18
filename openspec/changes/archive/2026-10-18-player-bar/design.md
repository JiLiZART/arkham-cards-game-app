## Context

- `viewerOf(game)` = `pending.inv ?? active ?? lead` decides whose hand, strip and markers are shown; `handVisible(privacy, n, viewer, revealedFor)` hides the hand until `confirmHandoff` records `revealedFor`. `HandOff` (Hud.tsx) shows "Pass to" whenever the viewer's hand isn't visible.
- `StatBar` (bottom-left) shows the viewer; `InvTokens` (right column) the others with a modal; `Ribbon` carries the turn portraits with pips (`ribbonModel`). `optionHome` sends investigator-card options to `portrait` (viewer) or `invModal` (others).
- A teammate's commit (`commitOther`) or reaction makes them `pending.inv`, so the view jumps to them and the hand-off box appears at once.
- In-force ADRs: 0001–0003. None constrains this; the change introduces a durable one (below).

## Goals / Non-Goals

**Goals:**
- One place for players; looking is a view-state override that never touches who decides.
- The "can act" moment is a signal, not a screen takeover, until the player takes it.

**Non-Goals:**
- Two devices; the phone layout of the bar's sheet (phone-landscape).

## Diagram (C4-inspired, component level, ASCII; the browser app is the only container)

```
+------------------------------------------------------------------------------------+
| Browser app                                                                        |
|  game store: pending.inv (decider), active, invs, order     view store: viewing    |
|                     |                                              |               |
|                     v                                              v               |
|  +----------------------------+   bar model   +-------------------------------+    |
|  | players.ts (pure)          |-------------->| PlayerBar                     |    |
|  |  barModel(game, view)      |               |  Avatar x N: ring, counts,    |    |
|  |  shownInv(game, view)      |               |   pips, can-act pulse, option |    |
|  |  canAct(game): {inv,label} |               |   highlight; own -> Sheet     |    |
|  +----------------------------+               |  "back to <decider>"          |    |
|            | shownInv                         +---------------+---------------+    |
|            v                                                  | tap other: viewing  |
|  HandFan / PlayStrip / Table markers read shownInv            | tap can-act: hand-off|
|  (hand only if handVisible for shownInv)                      v                     |
|  HandOff: shows when the decider's view is taken and the hand is private           |
+------------------------------------------------------------------------------------+
```

## Decisions

### 1. `viewing` is view state; the decider is game state (ADR-0004)
`view.viewing: InvId | null` overrides whose table is shown; `shownInv(game, view) = viewing ?? viewerOf(game)`. Choices are offered only when `shownInv === viewerOf(game)`. `viewing` is cleared when `pending.inv` changes. Alternative: switch the engine's notion of the active player; rejected, the engine must not know about looking.

### 2. The can-act signal delays the hand-off
Today a teammate's decision jumps the view at once. With the bar, while `pending.inv !== active` and the pending kind is `commit`/`reaction`, the table stays on `active`'s view with `viewing = active` set automatically, the avatar pulses, and the tap sets `viewing = null` (the decider's view), which is where `HandOff` shows "Pass to" for private hands. No engine change: the prompt was pending all along.

### 3. Sheet replaces the dock
`StatBody` (portrait, ability, skills, token stacks) becomes the sheet's content, anchored under the avatar; `FlashStat` moves to the avatar's counts. The investigator modal stays for a teammate's cards when hands are not private, reached from their sheet.

### 4. Options on avatars
`optionHome` returns `bar` for investigator-card options (both the viewer's and others'); `PlayerBar` highlights those avatars and answers on tap. The modal's option buttons remain for cards in a teammate's area.

### 5. Ribbon keeps the phases
`ribbonModel.turns` feeds the bar; the ribbon renders phases only. Tips anchored to `portrait` move to the viewer's avatar.

## Risks / Trade-offs

- [Looking at a teammate while a choice waits confuses whose turn it is] -> the bar's "back to Roland" control is always visible while `viewing` is set, and the instruction bar keeps the decider's instruction.
- [Delaying the hand-off changes a flow the drive scripts rely on] -> `drive-calm.js` already clicks the hand-off box; it now first taps the pulsing avatar; updated in the same change.
- [Bar width with four players plus phases] -> counts collapse to icons at 1100 px, pips under the avatar; measured at 1366 and 1600.

## Migration Plan

UI only. Rollback: git.

## Open Questions

- Whether the sheet also lists a teammate's threat area when hands are private (public information). Default: yes, threats and assets are public; only the hand is hidden.
