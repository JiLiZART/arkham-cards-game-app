## Why

The game has every cycle's cards and campaigns, but only the five core investigators can be picked: `content/investigators/` holds five hand-written files. The snapshot describes all 93 regular investigators with their deckbuilding rules, signatures and weaknesses, ArkhamCards ships the 49 official starter decklists, and their Russian names, text and images are already in the content.

## What Changes

- `npm run import:investigators` generates an investigator definition for every regular investigator in the snapshot (parallel fronts are left for later): stats come from the card, and the file adds signatures, weaknesses, deck size and deckbuilding options in the full option grammar (faction, level, trait, tag, type, name, text, uses, limit, at least, not), plus the name, class and pack so the picker can show them before their pack loads. Hand-written files keep winning.
- `npm run import:investigators` also writes the official starter decks from ArkhamCards' list (49 investigators) as generated deck files.
- The investigator step of the new-game wizard lists every investigator with class and cycle filters and a search, as avatars; an investigator whose ability has no written behaviour carries the partly-implemented note; one without a starter deck shows "needs a deck" until the deck builder (change `deck-builder`) lets the player build one.
- Starting a campaign loads the packs of the chosen investigators and their decks as well as the campaign's.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `investigator-decks`: every regular investigator defined from the snapshot, the starter decks from ArkhamCards, the filtered picker.

## Impact

- New `scripts/import-investigators.ts`, `content/investigators-generated/`, `content/decks-generated/`; `src/content/schema.ts` (`InvestigatorDef` widened: name, faction, pack, generated, full deck options), loader, `src/ui/menu/NewGame.tsx` and the store's prepare step.
- `validateDeck` reads the wider options (the generic validator itself is in `deck-builder`; here only the options it already understands are checked, the rest pass).
