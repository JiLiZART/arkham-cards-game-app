## Context

Card data: `db.cards` per pack, loaded with `loadPack`; text through `cardText`; images through `cardImage` (`/cards/<code>.webp` for the 229 hosted scans, `cards-ru/` for Russian ones). arkham.build's CDN serves every scan as `https://cdn.arkham.build/optimized/<code>.webp` without CORS headers, which only matters to WebGL. The details rows and the keyword glossary (`details.ts`, `glossary.ts`) already describe a card.

## Goals / Non-Goals

**Goals:** browse, filter and read every card and investigator; know what works in the game.

**Non-Goals:** deck building (the `deck-builder` change adds a "+" to this same list); taboo; FAQ and errata; offline images.

## Decisions

1. **Screen:** `screen: "catalog"` with tabs; a filter column (a drawer on the phone, ADR-0005) and a grid of card images that switches to a compact list. 5,859 cards: the grid renders in pages of 60 as the list scrolls (an IntersectionObserver sentinel), no virtualisation library.
2. **Filters** are pure (`src/ui/catalog/filter.ts`: `matches(card, text, filters)`), tested; their state lives in the view store for the session.
3. **Works in the game:** `implemented(db, code)` = the card has abilities or a script in content, or its text is empty or only keywords the engine knows (a skill with icons only, a vanilla enemy). Tested on core cards.
4. **Images:** `cardImage(..., { remote: true })` returns the CDN URL when the game doesn't host the scan; the table (WebGL) never asks for remote images. ADR-0008.
5. **Loading:** opening the catalog calls `loadPack` for every pack in parallel with a progress line; text in the locale comes with each pack.
6. **Page:** reuses `cardDetails` rows and the glossary; signatures and weaknesses from the investigator definition (`all-investigators`).

## Risks / Trade-offs

- [The CDN is down or blocks hotlinking] → the image falls back to the card drawn from its data (the existing card face) and the text is unaffected.
- [4 MB loaded on opening] → once, cached; the rest of the game is unaffected.

## Migration Plan

Additive.

## Open Questions

None.
