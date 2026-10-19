## Why

Every cycle's cards are in the content, but there is nowhere to look at them: a player can only meet a card when it is drawn. To learn the game and to choose investigators and cards, the player wants what ArkhamDB offers: every card and investigator, filterable, with its full text, in their language.

## What Changes

- A **Cards** item on the title menu opens a catalog with two tabs, Investigators and Player cards (encounter cards in a third tab, filtered by encounter set).
- Filters: class, type, cycle and pack, level, cost, traits, skill icons, slot, text search (name, traits and text, in the game's language), and "works in the game". The filters are kept for the session.
- Each card has a page: the card image (both sides), its text in the game's language with the keyword glossary, its stats, pack and encounter set, and a badge: **works in the game** (its behaviour is written, or it has no rules text to run) or **text only**. An investigator's page adds the back (deckbuilding), signatures and weaknesses, and the starter deck when there is one.
- Images: the game's own scans and Russian images where it has them; otherwise the scan from arkham.build's CDN (`cdn.arkham.build/optimized/<code>.webp`), linked, not stored (ADR-0008).
- The catalog loads every pack when opened (about 4 MB of card data, cached by the browser), not before.

## Capabilities

### New Capabilities

- `card-catalog`: browsing, filtering and reading every card and investigator.

### Modified Capabilities

None.

## Impact

- New `src/ui/catalog/` (screen, filters, list, card page), `src/ui/images.ts` (CDN fallback for HTML images only; the WebGL table keeps same-origin scans), title menu item, strings in English and Russian; `adr/0008`.
- No engine change.
