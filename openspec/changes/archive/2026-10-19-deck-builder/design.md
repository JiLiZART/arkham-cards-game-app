## Context

`validateDeck` checks deck size, copies and `deckOptions` of `{faction, level}`; the editor (`DeckEditor.tsx`, `ui/decks.ts`) swaps up to 5 level-0 cards. A campaign stores each investigator's deck as card codes with `xp` (`engine/campaign.ts`); xp is earned but never spent. After `all-investigators`, `InvestigatorDef.deckOptions` carries the snapshot's full option grammar; after `card-catalog`, the filtered card list and its filters exist as components.

## Goals / Non-Goals

**Goals:** free building for about 83 of 93 investigators; experience spent between scenarios.

**Non-Goals:** investigators with deck-creation choices (about 10); customizable cards; taboo lists; deck import/export beyond the existing ArkhamDB reader.

## Decisions

1. **Validator** (`engine/decks.ts`): a card is allowed when some option accepts it; options apply in order with their limits ("up to 5 other level 0 cards" counts against that option); `not` options exclude; `atleast` is checked over the whole deck. Each refusal carries a message key and values for plain words in both languages. Unknown option keys refuse the investigator up front.
2. **Builder** (`DeckEditor.tsx` rebuilt): left the deck, right the catalog list with the investigator's filter preset (their classes and levels); each list row has "+" or the reason it can't be added. Start-from: starter decks, saved decks, empty.
3. **Upgrades** (`engine/campaign.ts`): `upgradeDeck(campaign, inv, newDeck)` computes the cost from the old and new decks (pure, tested), refuses over budget, and stores the deck and xp. The cost rules: added level-0 card 1 xp each (Myriad: one price per title), an added card of level L costs L, a same-title replacement costs the level difference (min 1), Exceptional doubles. Signatures and weaknesses never cost.
4. **Campaign log:** an Upgrade decks button per investigator opens the builder in upgrade mode (xp shown, Save spends).

## Risks / Trade-offs

- [Rule edge cases (Myriad bought later, mixed levels of a title)] → the cost function is pure with a test per rule; anything ambiguous costs the higher amount.
- [Upgraded cards from other packs are text only] → the builder shows the catalog's badge on each card.

## Migration Plan

Saved custom decks keep working (they are plain deck files). Campaigns in progress gain the upgrade button; their xp is unspent so far.

## Open Questions

None.
