## MODIFIED Requirements

### Requirement: Deck configuration
The new-game deck step SHALL show, in three rows: the picked investigators as avatars with their class and whether their deck is ready (a click switches to that investigator); that investigator's decks as tabs like a browser's (their starter decks, then their saved decks, then a "+" tab that starts a new deck holding only the signature cards and the weakness slot); and the deck of the tab on show, which is the deck that investigator brings. The deck area SHALL show on the left the deck as a grid of card images grouped by type with the copies of each, the signature cards and weaknesses apart, and on the right the cards the investigator may take, with a search and filters by class (icons), type and level. Hovering a card on the right offers Add, disabled with the reason when it can't go in, and Replace; Replace lights the deck's cards it may stand in for, and a click on one swaps them (Escape cancels). Hovering a card of the deck offers Remove. The basic weakness is chosen there or left random. The deck's problems SHALL be shown in plain words as it changes, and Continue SHALL wait while a picked investigator's deck has any. A starter deck is never modified: the first change to it makes a new saved deck, named "<investigator> · <date>" (numbered when the name is taken), whose tab opens; a saved deck is kept as it is edited.

#### Scenario: Build Zoey from empty
- **WHEN** the player opens a "+" tab for Zoey Samaras and adds 30 Guardian and neutral cards of level 0 with at most two copies each
- **THEN** the deck is valid with her signatures and a basic weakness, it is saved as a deck of hers, and Continue is enabled

#### Scenario: A card she can't take
- **WHEN** the player looks at a level 0 Mystic card in Zoey's deck area after adding five off-class cards
- **THEN** its Add is disabled with "up to 5 other level 0 cards"

#### Scenario: Replace a card
- **WHEN** the player hovers Extra Ammunition on the right of Roland's starter deck, chooses Replace and clicks a Flashlight in the deck
- **THEN** a new tab "Roland · <date>" opens with Extra Ammunition in place of one Flashlight, still 30 cards and valid, and the starter deck tab is unchanged

#### Scenario: Swap two cards
- **WHEN** Roland's starter deck has Flashlight ×2 removed and Physical Training ×2 added
- **THEN** the deck stays at 30 cards and valid, in a new saved deck's tab, and the starter deck is unchanged

#### Scenario: Too many swaps
- **WHEN** the player has removed 5 cards from a starter deck and removes a sixth
- **THEN** the deck step allows it: there is no swap limit, only the deckbuilding rules

#### Scenario: Invalid deck
- **WHEN** the player adds a third copy of a card
- **THEN** Add is disabled with "three copies of Machete; the limit is two"

### Requirement: Custom decks saved
Custom decks SHALL be saved on the device as they are edited, finished or not, under a name (default "<investigator> · <date>") and offered as tabs beside the starter decks in later new games; a double-click on a tab renames it and its × deletes it after a second click. A saved deck SHALL be validated again whenever it is shown; one that doesn't validate (unfinished, or a pack removed) is shown with its problems and can't be brought into a game until it is fixed.

#### Scenario: Reuse a custom deck
- **WHEN** the player saved "Roland · 17 Oct" and starts another campaign
- **THEN** the deck step offers "Roland · 17 Oct" as a tab next to Roland's starter deck

#### Scenario: An unfinished deck
- **WHEN** the player leaves a new deck at 12 cards and comes back to the deck step later
- **THEN** its tab is there, marked as needing fixes, with its problems shown when opened

## ADDED Requirements

### Requirement: Generic deckbuilding rules
Deck validation SHALL apply an investigator's deckbuilding options from the snapshot: class and level ranges, traits, tags, card types, card names, text patterns, uses, per-option limits, "at least" counts and exclusions, together with the deck size, copy limits by title, signatures and weaknesses. An investigator whose options need a choice the builder doesn't offer (a class, an option or a deck size chosen at deck creation, or a rule about specific cards) SHALL be refused by the builder with that reason in plain words.

#### Scenario: Carolyn Fern
- **WHEN** a Carolyn Fern deck holds a level 3 card that heals horror from another class
- **THEN** it is valid, because her options allow cards that heal horror at level 0-5

#### Scenario: Lola Hayes
- **WHEN** the player opens the builder for Lola Hayes
- **THEN** it says her deck needs a role choice the builder doesn't offer yet
