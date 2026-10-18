## MODIFIED Requirements

### Requirement: Deck configuration
From the new-game deck step, the player SHALL be able to build a custom deck for an investigator, starting from one of their starter decks, a saved deck, or an empty deck. The builder SHALL show the deck grouped by type with each card's cost, level, copies and glance chips, the signature cards and the weakness slot apart, and beside it the catalog's filtered card list, where a card the investigator may take can be added and any other card says why it can't. Any card of the deck may be removed. The builder SHALL show the deck's validation result in plain words as it changes and MUST NOT save an invalid deck. A starter deck is never modified; saving creates a custom deck.

#### Scenario: Build Zoey from empty
- **WHEN** the player starts an empty deck for Zoey Samaras and adds 30 Guardian and neutral cards of level 0 with at most two copies each
- **THEN** the deck is valid with her signatures and a basic weakness, and saving creates a custom deck

#### Scenario: A card she can't take
- **WHEN** the player looks at a level 0 Mystic card in Zoey's builder after adding five off-class cards
- **THEN** it is shown as not addable with "up to 5 other level 0 cards"

#### Scenario: Swap two cards
- **WHEN** Roland's starter deck is edited: Flashlight ×2 removed and Physical Training ×2 added
- **THEN** the deck stays at 30 cards, the builder shows it valid, and saving creates a custom deck with the change

#### Scenario: Too many swaps
- **WHEN** the player has removed 5 cards from a starter deck and removes a sixth
- **THEN** the builder allows it: there is no swap limit any more, only the deckbuilding rules

#### Scenario: Invalid deck
- **WHEN** the player adds a third copy of a card
- **THEN** the builder shows "three copies of Machete; the limit is two" and Save is disabled

## ADDED Requirements

### Requirement: Generic deckbuilding rules
Deck validation SHALL apply an investigator's deckbuilding options from the snapshot: class and level ranges, traits, tags, card types, card names, text patterns, uses, per-option limits, "at least" counts and exclusions, together with the deck size, copy limits by title, signatures and weaknesses. An investigator whose options need a choice the builder doesn't offer (a class, an option or a deck size chosen at deck creation, or a rule about specific cards) SHALL be refused by the builder with that reason in plain words.

#### Scenario: Carolyn Fern
- **WHEN** a Carolyn Fern deck holds a level 3 card that heals horror from another class
- **THEN** it is valid, because her options allow cards that heal horror at level 0-5

#### Scenario: Lola Hayes
- **WHEN** the player opens the builder for Lola Hayes
- **THEN** it says her deck needs a role choice the builder doesn't offer yet
