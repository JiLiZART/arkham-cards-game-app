## Why

The deck step only allows swapping up to 5 level-0 cards of a starter deck, and experience earned in a campaign can't be spent. With every investigator (change `all-investigators`) most of them have no starter deck, and the catalog (change `card-catalog`) already lists and filters every card. Players need to build decks and upgrade them between scenarios.

## What Changes

- The deck editor becomes a deck builder: start from a starter deck, a saved deck or an empty deck; add cards from the catalog's filtered list (only cards the investigator may take are addable, the rest say why); remove any card; the signatures and the weakness are fixed or chosen.
- One generic validator over the snapshot's deckbuilding options: classes and levels, traits, tags, card types, names, text patterns, uses, limits ("up to 5 other level 0 cards"), "at least", exclusions, deck size, copy limits, signatures and weaknesses. Investigators whose options need a choice the builder doesn't offer yet (a class picked at deck creation, an option choice, a deck size choice, specific-card rules: about 10, Lola Hayes, Mandy Thompson, Suzi among them) are refused in plain words for now.
- Between scenarios the campaign log offers **Upgrade decks**: spend experience on new cards and higher levels by the rules (a level 0 card costs 1, an upgrade costs the level difference, Exceptional costs double, Myriad copies come together); the campaign keeps each investigator's deck and unspent experience.
- The 5-swap limit goes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `investigator-decks`: deck configuration becomes free building with the generic validator.
- `campaign-play`: spending experience on deck upgrades between scenarios.

## Impact

- `src/engine/decks.ts` (validator over the full option grammar), `src/ui/decks.ts` (no swap budget), `src/ui/menu/DeckEditor.tsx` (rebuilt on the catalog's list and filters), `src/engine/campaign.ts` (upgrades, xp spent), the campaign log screen; strings in English and Russian.
- Depends on `all-investigators` (definitions with the full options) and `card-catalog` (list, filters, images).
