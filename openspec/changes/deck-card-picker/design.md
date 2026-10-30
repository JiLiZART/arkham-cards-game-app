## Context

`DeckEditArea` renders the deck and the pool side by side (a two-column grid) on the desktop; on the phone the pool is a full-screen layer opened from "Add cards". Replace starts in the pool: it sets `replacing` to the incoming card and lights the deck's cards `whyNotReplace(db, deck, out, into)` accepts. The same component serves the wizard's deck step and the deck builder.

## Goals / Non-Goals

**Goals:** the deck at full width with bigger cards; the pool in one picker for both layouts; Replace starting from the deck card, offering only valid stand-ins.

**Non-goals:** new pool filters, drag and drop, multi-copy replace, the wizard filter toolbar (`wizard-filter-toolbar` covers the other steps).

## Decisions

### 1. One picker with two modes, owned by `DeckEditArea`

View state (ADR-0004): `picker: null | { mode: "add" } | { mode: "replace"; out }`. Both modes render the same pool section (search, class, type and level filters) in the same frame; only the list and the card's action differ. Opening it focuses the dialog; Escape, Close or the scrim close it.

```
  DeckEditArea
  +-------------------------------------------------------------+
  | header: 22 of 30 cards   [+ Add cards]     Basic weakness v |
  | Assets . 12  [card][card][card][card][card][card] ...       |
  |               hover: [Replace] [Remove]                     |
  +-----------------------------+-------------------------------+
           | Add cards                  | Replace on a card
           v                            v
  +------------------------------------------------------------+
  | picker (dialog on desktop, full screen on phone)           |
  |  title: "Add cards" | "Replace Machete with..."   [x]      |
  |  search, class, type, level filters                        |
  |  add:     builderPool(...)          card: [+ Add]           |
  |  replace: replacementsFor(db, deck, out, builderPool(...)) |
  |           card or [Replace]: replaceCard, close            |
  +------------------------------------------------------------+
```

Rejected: the shared `BottomSheet` on the phone (ADR-0017 is for details panes; the pool is a full working surface, and the phone spec already opens it full screen); a separate component per mode (the same filters twice).

### 2. `replacementsFor` in `src/ui/game/decks.ts`

`replacementsFor(db, deck, out, pool)` keeps the pool cards other than `out` for which `whyNotReplace` finds no new problem. Pure and unit-tested beside `replaceCard`; the engine's `whyNotReplace` stays the one rule.

### 3. Sizes in the component's CSS Module

Deck grid `minmax(150px, 1fr)`; picker grid `minmax(200px, 1fr)`, `minmax(150px, 1fr)` on the phone. The picker's frame branches on `useLayoutMode()` (ADR-0005) through one class, not a media query.

## Risks / Trade-offs

- [`whyNotReplace` validates the whole deck for each pool card] -> the pool is a few hundred cards and validation is fast; it runs only while the replace picker is open. The add picker already calls `whyNot` per card.
- [Hover-only actions on touch] -> unchanged from today: a tap shows the card's buttons, as the pool's Add did.

## Migration Plan

None.

## Open Questions

None. In-force ADRs reviewed: ADR-0004, ADR-0005, ADR-0016, ADR-0017; this design stays within them.
